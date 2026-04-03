import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import fs from "fs"
import path from "path"

// Force Node.js runtime (required for unpdf WASM + mammoth)
export const runtime = "nodejs"
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Few-shot loader — picks 2 example questions from rated dataset per game type
// ---------------------------------------------------------------------------
function getFewShotExamples(gameType: string): string {
  try {
    const dir = path.join(process.cwd(), "ai/dataset/rated")
    const files = fs.readdirSync(dir).filter(f => f.endsWith(`_${gameType}.json`))
    if (files.length === 0) return ""
    const file = files[Math.floor(Math.random() * files.length)]
    const all = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as unknown[]
    // Pick 2 examples — 1 easy (difficulty 1) + 1 hard (difficulty 3)
    const easy = all.find((q: any) => q.difficulty_teacher === 1 || q.difficulty === 1)
    const hard = all.find((q: any) => q.difficulty_teacher === 3 || q.difficulty === 3)
    const examples = [easy, hard].filter(Boolean).slice(0, 2).map((q: any) => ({
      id: q.id,
      question: q.question,
      choices: q.choices,
      correct: q.correct,
      explanation: q.explanation?.slice(0, 60) ?? "",
      difficulty: q.difficulty_teacher ?? q.difficulty,
    }))
    if (examples.length === 0) return ""
    return `\n\nตัวอย่างคำถามที่ดี (ห้ามคัดลอก — ใช้เป็นแนวทางรูปแบบเท่านั้น):\n${JSON.stringify(examples, null, 2)}`
  } catch {
    return ""
  }
}

// ---------------------------------------------------------------------------
// AI client — reads from env, works with Groq OR vLLM (OpenAI-compatible)
// ---------------------------------------------------------------------------
function getClient() {
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1",
    apiKey: process.env.AI_API_KEY ?? "none",
  })
}

const MODEL = process.env.AI_MODEL ?? "llama-3.1-8b-instant"

// ---------------------------------------------------------------------------
// Game-specific system prompts (Agent 2 variants)
// ---------------------------------------------------------------------------
const NO_CHINESE =
  "CRITICAL: Do NOT output Chinese (中文), Japanese, Korean, Arabic, or any script not present in the document. Write ONLY in the same language as the document (Thai or English)."

const GAME_PROMPTS: Record<string, string> = {
  flappy:
    `You are writing quiz questions for a fast-paced flying game. Keep questions SHORT (under 12 words) and choices very brief (1-4 words each). The player reads while controlling a bird, so clarity is critical. ${NO_CHINESE}`,
  racer:
    `You are writing quiz questions for a racing game. Keep EVERY question under 12 words total. Choices must be 1-4 words each — no long phrases. ${NO_CHINESE}`,
  shooter:
    `You are writing quiz questions for a space shooter game. Focus on IDENTIFICATION questions: 'Which term describes…?', 'What is X?'. Each wrong choice should be a plausible distractor from the same domain. ${NO_CHINESE}`,
  snake:
    `You are writing quiz questions for a snake game where order matters. Prefer SEQUENTIAL or PROCESS questions: 'What is the FIRST step in…?', 'Which comes NEXT after…?'. Choices should represent different stages or steps. ${NO_CHINESE}`,
  bricks:
    `You are writing quiz questions for a brick-breaker game. Focus on DEFINITIONS and TECHNICAL TERMS: 'What does X mean?', 'Which term refers to…?'. Choices should test precise vocabulary knowledge. ${NO_CHINESE}`,
}

const DEFAULT_GAME_PROMPT =
  `You are an expert exam question writer. Respond ONLY with a valid JSON array — no markdown fences, no explanation. ${NO_CHINESE}`

// ---------------------------------------------------------------------------
// Text cleaning — strip PDF artefacts before sending to AI
// ---------------------------------------------------------------------------
function cleanText(raw: string): string {
  return raw
    .replace(/\x00/g, "")                   // strip null bytes from PDF
    .replace(/([^\n]{15,})\1+/g, "$1")      // deduplicate repeated slide titles
    .replace(/[ \t]{2,}/g, " ")             // collapse multiple spaces/tabs
    .replace(/\n{3,}/g, "\n\n")             // collapse excessive newlines
    .trim()
}

// ---------------------------------------------------------------------------
// URL → text helpers
// ---------------------------------------------------------------------------
async function fetchGoogleDrive(url: string): Promise<string> {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) throw new Error("ไม่พบ ID ใน Google Drive URL — ตรวจสอบลิงก์อีกครั้ง")
  const id = match[1]

  // Try Docs → Slides → Sheet (txt export)
  const candidates = [
    `https://docs.google.com/document/d/${id}/export?format=txt`,
    `https://docs.google.com/presentation/d/${id}/export/txt`,
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`,
  ]
  for (const exportUrl of candidates) {
    try {
      const res = await fetch(exportUrl, { redirect: "follow" })
      if (res.ok) return cleanText(await res.text()).slice(0, 4000)
    } catch { /* try next */ }
  }
  throw new Error("เข้าถึง Google Drive ไม่ได้ — ตรวจสอบว่าเปิดแชร์แบบ 'ทุกคนที่มีลิงก์' แล้ว")
}

async function fetchYouTubeTranscript(url: string): Promise<string> {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  if (!match) throw new Error("ไม่พบ Video ID ใน YouTube URL")
  const videoId = match[1]

  const { YoutubeTranscript } = await import("youtube-transcript")
  const items = await YoutubeTranscript.fetchTranscript(videoId)
  if (!items || items.length === 0) throw new Error("วิดีโอนี้ไม่มี transcript — ลองเปิดคำบรรยายอัตโนมัติก่อน")
  return cleanText(items.map(t => t.text).join(" ")).slice(0, 4000)
}

// ---------------------------------------------------------------------------
// File → text (Agent 0: Parser)
// ---------------------------------------------------------------------------
async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const type = file.type
  const name = file.name.toLowerCase()

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const { extractText: unpdfExtract } = await import("unpdf")
    const uint8 = new Uint8Array(buffer)
    const { text } = await unpdfExtract(uint8, { mergePages: true })
    return cleanText(text ?? "").slice(0, 4000)
  }

  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return cleanText(result.value).slice(0, 4000)
  }

  // Plain text
  return cleanText(buffer.toString("utf-8")).slice(0, 4000)
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
        content:
          `You are an expert academic summarizer. Respond only with a JSON object containing key "bullets" as an array of strings. ${NO_CHINESE}`,
      },
      {
        role: "user",
        content: `สรุปเนื้อหาต่อไปนี้เป็น 6-8 ประเด็นสำคัญ
ถ้าเอกสารเป็นภาษาไทย ให้ตอบเป็นภาษาไทยเท่านั้น
ถ้าเอกสารเป็นภาษาอังกฤษ ให้ตอบเป็นภาษาอังกฤษเท่านั้น
ตอบเป็น JSON เท่านั้น: {"bullets": ["ประเด็นที่ 1", "ประเด็นที่ 2", ...]}

เอกสาร:
${text}`,
      },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? "{}"
  let bullets: string[] = []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) bullets = parsed as string[]
    else if (Array.isArray(parsed?.bullets)) bullets = parsed.bullets as string[]
  } catch {
    bullets = raw
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8)
  }
  // กรอง JSON objects ออก — model บางครั้ง return question JSON แทน summary text
  return bullets
    .filter((b) => typeof b === "string" && !b.trim().startsWith("{") && !b.trim().startsWith("[") && b.length > 5)
    .slice(0, 8)
}

// ---------------------------------------------------------------------------
// Agent 2: Question Generator (game-type aware)
// ---------------------------------------------------------------------------
async function generateQuestions(client: OpenAI, text: string, gameType?: string) {
  const gameHint = gameType && GAME_PROMPTS[gameType] ? GAME_PROMPTS[gameType] : ""
  const systemPrompt = gameHint
    ? `${gameHint}\n\nRespond ONLY with a valid JSON object containing key "questions" as an array.`
    : `${DEFAULT_GAME_PROMPT.replace("JSON array", 'JSON object containing key "questions" as an array')}`
  const fewShot = gameType ? getFewShotExamples(gameType) : ""

  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: 3200,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `สร้างคำถามแบบเลือกตอบ 10 ข้อจากเนื้อหาด้านล่าง
กฎสำคัญ:
- ถ้าเนื้อหาเป็นภาษาไทย ให้เขียนคำถามและตัวเลือกเป็นภาษาไทยทั้งหมด
- ถ้าเนื้อหาเป็นภาษาอังกฤษ ให้เขียนเป็นภาษาอังกฤษทั้งหมด
- แต่ละข้อมี 4 ตัวเลือก, คำตอบถูกต้อง 1 ข้อ
- คำอธิบายสั้นมาก ไม่เกิน 15 คำ
- ใส่เฉพาะ field ที่กำหนดเท่านั้น ห้ามเพิ่ม field อื่น

ตอบเป็น JSON เท่านั้น ไม่มี markdown:
{"questions":[{"id":1,"question":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"correct":0,"explanation":"...","difficulty":1}]}
(correct = index 0-3, difficulty = 1/2/3)
${fewShot}
เนื้อหา:
${text}`,
      },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? "{}"

  // Strip possible markdown code fences (Groq sometimes still adds them)
  const cleaned = raw
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed?.questions)) return parsed.questions
  } catch (e) {
    console.error("[generateQuestions] JSON parse failed:", e)
    console.error("[generateQuestions] raw output (first 500):", cleaned.slice(0, 500))

    // Fallback: extract complete question objects from truncated JSON
    const objects: unknown[] = []
    const re = /\{[^{}]*"id"\s*:\s*\d+[^{}]*"correct"\s*:\s*\d[^{}]*\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(cleaned)) !== null) {
      try { objects.push(JSON.parse(m[0])) } catch { /* skip malformed */ }
    }
    if (objects.length >= 3) {
      console.log(`[generateQuestions] recovered ${objects.length} questions from truncated output`)
      return objects
    }
    return null
  }
  return null
}

// ---------------------------------------------------------------------------
// POST /api/generate
// Accepts:
//   • FormData { file: File, gameType?: string }   — initial upload
//   • JSON      { text: string, gameType: string }  — re-generate for a game
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? ""
    let text: string
    let gameType: string | undefined

    if (contentType.includes("application/json")) {
      const body = await req.json() as { text?: string; gameType?: string; url?: string; urlType?: string }

      // URL mode: Google Drive or YouTube
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
        // Re-generate mode: client sends stored extracted text + gameType
        if (!body.text || body.text.trim().length < 50) {
          return NextResponse.json({ error: "No text provided" }, { status: 400 })
        }
        text = cleanText(body.text).slice(0, 4000)
        gameType = body.gameType ?? undefined
      }
    } else {
      // File upload mode
      const form = await req.formData()
      const file = form.get("file") as File | null
      gameType = (form.get("gameType") as string | null) ?? undefined

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      // Agent 0: extract + clean text
      text = await extractText(file)

      if (!text || text.trim().length < 50) {
        return NextResponse.json({ error: "Could not extract text from file" }, { status: 422 })
      }
    }

    const client = getClient()

    // Re-generate mode (single game) — skip summarizer to save tokens
    if (gameType) {
      const questions = await generateQuestions(client, text, gameType)
      if (!questions) {
        return NextResponse.json({ error: "Failed to parse AI question response" }, { status: 500 })
      }
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

    // Use flappy as the default general questions (fallback)
    const questions = flappy ?? racer ?? shooter ?? snake ?? bricks
    if (!questions) {
      return NextResponse.json({ error: "Failed to parse AI question response" }, { status: 500 })
    }

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
