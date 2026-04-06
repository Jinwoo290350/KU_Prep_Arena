import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import fs from "fs"
import path from "path"

// Force Node.js runtime (required for unpdf WASM + mammoth)
export const runtime = "nodejs"
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Few-shot loader — returns example messages for JSON format only
// Strips actual text to avoid language contamination
// ---------------------------------------------------------------------------
function getFewShotMessages(gameType: string): { role: "user" | "assistant"; content: string }[] {
  try {
    const dir = path.join(process.cwd(), "ai/dataset/rated")
    const files = fs.readdirSync(dir).filter(f => f.endsWith(`_${gameType}.json`))
    if (files.length === 0) return []
    const all = JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf-8")) as any[]
    const picked = all.slice(0, 3).map((q: any) => ({
      id: q.id,
      question: "...",
      choices: ["A. ...", "B. ...", "C. ...", "D. ..."],
      correct: q.correct,
      explanation: "...",
      difficulty: q.difficulty_teacher ?? q.difficulty,
    }))
    if (picked.length === 0) return []
    return [
      { role: "user", content: "สร้างคำถาม 3 ข้อ (format example)" },
      { role: "assistant", content: JSON.stringify({ questions: picked }) },
    ]
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// AI client — Typhoon (OpenAI-compatible), fallback to Groq for dev
// ---------------------------------------------------------------------------
function getClient() {
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? "https://api.opentyphoon.ai/v1",
    apiKey: process.env.AI_API_KEY ?? "none",
  })
}

const MODEL = process.env.AI_MODEL ?? "typhoon-v2-70b-instruct"

// ---------------------------------------------------------------------------
// Game-type system prompts — Thai-first, concise, structured
// ---------------------------------------------------------------------------
const GAME_PROMPTS: Record<string, string> = {
  flappy:
    "คุณเขียนคำถามสำหรับเกมบิน ต้องสั้นมาก (ไม่เกิน 12 คำ) ตัวเลือกสั้น 1-4 คำต่อตัวเลือก ผู้เล่นต้องอ่านขณะควบคุมนก",
  racer:
    "คุณเขียนคำถามสำหรับเกมแข่งรถ คำถามต้องสั้น ไม่เกิน 12 คำ ตัวเลือก 1-4 คำ ต้องอ่านได้เร็ว",
  shooter:
    "คุณเขียนคำถามสำหรับเกมยิงยาน เน้นคำถามระบุตัวตน: 'คำศัพท์ใดหมายถึง...?' หรือ 'X คืออะไร?' ตัวเลือกผิดต้องน่าเชื่อถือ",
  snake:
    "คุณเขียนคำถามสำหรับเกมงู เน้นคำถามลำดับขั้นตอน: 'ขั้นตอนแรกคือ...?' หรือ 'ลำดับต่อไปคือ...?' ตัวเลือกแสดงขั้นตอนต่างกัน",
  bricks:
    "คุณเขียนคำถามสำหรับเกมตีก้อนหิน เน้นคำถามนิยามและศัพท์เทคนิค: 'X หมายความว่าอะไร?' ทดสอบความรู้คำศัพท์เชิงลึก",
}

const DEFAULT_SYSTEM =
  "คุณเป็นผู้เชี่ยวชาญออกข้อสอบ ตอบด้วย JSON ที่ถูกต้องเท่านั้น ไม่มี markdown ไม่มีคำอธิบาย"

// ---------------------------------------------------------------------------
// Text cleaning
// ---------------------------------------------------------------------------
function cleanText(raw: string): string {
  return raw
    .replace(/\x00/g, "")
    .replace(/([^\n]{15,})\1+/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ---------------------------------------------------------------------------
// URL → text helpers
// ---------------------------------------------------------------------------
async function fetchGoogleDrive(url: string): Promise<string> {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) throw new Error("ไม่พบ ID ใน Google Drive URL — ตรวจสอบลิงก์อีกครั้ง")
  const id = match[1]
  const candidates = [
    `https://docs.google.com/document/d/${id}/export?format=txt`,
    `https://docs.google.com/presentation/d/${id}/export/txt`,
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`,
  ]
  for (const exportUrl of candidates) {
    try {
      const res = await fetch(exportUrl, { redirect: "follow" })
      if (res.ok) return cleanText(await res.text()).slice(0, 2500)
    } catch { /* try next */ }
  }
  throw new Error("เข้าถึง Google Drive ไม่ได้ — ตรวจสอบว่าเปิดแชร์แบบ 'ทุกคนที่มีลิงก์' แล้ว")
}

async function fetchYouTubeTranscript(url: string): Promise<string> {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  if (!match) throw new Error("ไม่พบ Video ID ใน YouTube URL")
  const { YoutubeTranscript } = await import("youtube-transcript")
  const items = await YoutubeTranscript.fetchTranscript(match[1])
  if (!items || items.length === 0) throw new Error("วิดีโอนี้ไม่มี transcript")
  return cleanText(items.map(t => t.text).join(" ")).slice(0, 2500)
}

// ---------------------------------------------------------------------------
// File → text (Parser)
// ---------------------------------------------------------------------------
async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const type = file.type
  const name = file.name.toLowerCase()

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const { extractText: unpdfExtract } = await import("unpdf")
    const { text } = await unpdfExtract(new Uint8Array(buffer), { mergePages: true })
    return cleanText(text ?? "").slice(0, 2500)
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return cleanText(result.value).slice(0, 2500)
  }
  return cleanText(buffer.toString("utf-8")).slice(0, 2500)
}

// ---------------------------------------------------------------------------
// Agent 1: Summarizer
// ---------------------------------------------------------------------------
async function summarize(client: OpenAI, text: string): Promise<string[]> {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: "คุณเป็นผู้สรุปเนื้อหาการศึกษาที่เชี่ยวชาญ ตอบด้วย JSON เท่านั้น",
      },
      {
        role: "user",
        content: `สรุปเนื้อหาต่อไปนี้เป็น 6-8 ประเด็นสำคัญเป็นภาษาไทย
ตอบเป็น JSON เท่านั้น: {"bullets": ["ประเด็น 1", "ประเด็น 2", ...]}

เนื้อหา:
${text}`,
      },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? "{}"
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
  let bullets: string[] = []
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) bullets = parsed
    else if (Array.isArray(parsed?.bullets)) bullets = parsed.bullets
  } catch {
    bullets = raw.split("\n").map(l => l.replace(/^[-•*\d.]+\s*/, "").trim()).filter(Boolean).slice(0, 8)
  }
  return bullets
    .filter(b => typeof b === "string" && !b.trim().startsWith("{") && b.length > 5)
    .slice(0, 8)
}

// ---------------------------------------------------------------------------
// Agent 2: Question Generator
// ---------------------------------------------------------------------------
async function generateQuestions(client: OpenAI, text: string, gameType?: string) {
  const gameHint = gameType && GAME_PROMPTS[gameType] ? GAME_PROMPTS[gameType] : ""
  const systemPrompt = gameHint
    ? `${gameHint}\n\nตอบด้วย JSON object ที่มี key "questions" เป็น array เท่านั้น ไม่มี markdown`
    : DEFAULT_SYSTEM
  const fewShotMessages = gameType ? getFewShotMessages(gameType) : []

  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: 1500,
    messages: [
      { role: "system", content: systemPrompt },
      ...fewShotMessages,
      {
        role: "user",
        content: `สร้างคำถามแบบเลือกตอบ 10 ข้อจากเนื้อหาด้านล่าง

กฎสำคัญ:
- เขียนคำถามและตัวเลือก**เป็นภาษาไทยทั้งหมด** โดยไม่คำนึงถึงภาษาต้นฉบับ
- แต่ละข้อมี 4 ตัวเลือก คำตอบถูก 1 ข้อ
- คำอธิบายสั้น ไม่เกิน 20 คำ ภาษาไทย
- ใส่เฉพาะ field: id, question, choices, correct, explanation, difficulty
- difficulty: 1 = จำ, 2 = ประยุกต์, 3 = วิเคราะห์ — กระจาย 3/5/2

ตอบ JSON เท่านั้น ห้ามมี markdown:
{"questions":[{"id":1,"question":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"correct":0,"explanation":"...","difficulty":1}]}
(correct = index 0-3)

เนื้อหา:
${text}`,
      },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? "{}"
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed?.questions)) return parsed.questions
  } catch (e) {
    console.error("[generateQuestions] JSON parse failed:", e)
    console.error("[generateQuestions] raw (first 500):", cleaned.slice(0, 500))
    // Fallback: extract complete question objects from truncated JSON
    const objects: unknown[] = []
    const re = /\{[^{}]*"id"\s*:\s*\d+[^{}]*"correct"\s*:\s*\d[^{}]*\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(cleaned)) !== null) {
      try { objects.push(JSON.parse(m[0])) } catch { /* skip */ }
    }
    if (objects.length >= 3) {
      console.log(`[generateQuestions] recovered ${objects.length} questions`)
      return objects
    }
    return null
  }
  return null
}

// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? ""
    let text: string
    let gameType: string | undefined

    if (contentType.includes("application/json")) {
      const body = await req.json() as { text?: string; gameType?: string; url?: string; urlType?: string }

      if (body.url && body.urlType) {
        if (body.urlType === "gdrive") {
          text = await fetchGoogleDrive(body.url)
        } else if (body.urlType === "youtube") {
          text = await fetchYouTubeTranscript(body.url)
        } else {
          return NextResponse.json({ error: "Unknown urlType" }, { status: 400 })
        }
        if (!text || text.trim().length < 50) {
          return NextResponse.json({ error: "ดึงเนื้อหาไม่ได้ หรือเนื้อหาน้อยเกินไป" }, { status: 422 })
        }
      } else {
        if (!body.text || body.text.trim().length < 50) {
          return NextResponse.json({ error: "ไม่มีเนื้อหา" }, { status: 400 })
        }
        text = cleanText(body.text).slice(0, 2500)
        gameType = body.gameType ?? undefined
      }
    } else {
      const form = await req.formData()
      const file = form.get("file") as File | null
      gameType = (form.get("gameType") as string | null) ?? undefined

      if (!file) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })

      text = await extractText(file)
      if (!text || text.trim().length < 50) {
        return NextResponse.json({ error: "ไม่สามารถดึงข้อความจากไฟล์ได้" }, { status: 422 })
      }
    }

    const client = getClient()

    // Re-generate mode (single game)
    if (gameType) {
      const questions = await generateQuestions(client, text, gameType)
      if (!questions) return NextResponse.json({ error: "สร้างข้อสอบไม่สำเร็จ" }, { status: 500 })
      return NextResponse.json({ questions, gameType })
    }

    // Initial upload — generate all 5 game variants + summary in parallel
    const [summaryBullets, flappy, racer, shooter, snake, bricks] = await Promise.all([
      summarize(client, text),
      generateQuestions(client, text, "flappy"),
      generateQuestions(client, text, "racer"),
      generateQuestions(client, text, "shooter"),
      generateQuestions(client, text, "snake"),
      generateQuestions(client, text, "bricks"),
    ])

    const questions = flappy ?? racer ?? shooter ?? snake ?? bricks
    if (!questions) return NextResponse.json({ error: "สร้างข้อสอบไม่สำเร็จ" }, { status: 500 })

    return NextResponse.json({
      questions,
      allGameQuestions: {
        flappy: flappy ?? questions,
        racer: racer ?? questions,
        shooter: shooter ?? questions,
        snake: snake ?? questions,
        bricks: bricks ?? questions,
      },
      summary: summaryBullets,
      extractedText: text,
    })
  } catch (err) {
    console.error("[/api/generate]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    )
  }
}
