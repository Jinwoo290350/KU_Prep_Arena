import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// Force Node.js runtime (required for unpdf WASM + mammoth)
export const runtime = "nodejs"
export const maxDuration = 300

// ---------------------------------------------------------------------------
// Raw fetch wrapper for Typhoon (avoids OpenAI SDK quirks with 400 errors)
// ---------------------------------------------------------------------------
const BASE_URL = () => (process.env.AI_BASE_URL ?? "https://api.opentyphoon.ai/v1").replace(/\/$/, "")
const API_KEY  = () => process.env.AI_API_KEY ?? ""
const MODEL    = () => process.env.AI_MODEL ?? "typhoon-v2.5-30b-a3b-instruct"

// NOTE: Typhoon max_tokens = TOTAL tokens (prompt + completion), unlike OpenAI which is output-only.
// Always set to a value >= estimated_prompt_tokens + desired_output_tokens.
// Safe default: 4096 covers all our use cases (prompt ≤ 2000 + output ≤ 2000).
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

async function chat(
  messages: { role: string; content: string | ContentPart[] }[],
  _maxOutputTokens = 1000,
  modelOverride?: string,
): Promise<string> {
  const res = await fetch(`${BASE_URL()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelOverride ?? MODEL(),
      max_tokens: 4096,   // total budget — Typhoon counts input+output together
      temperature: 0.5,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Typhoon API ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ""
}

// ---------------------------------------------------------------------------
// OCR fallback — ใช้ typhoon-ocr-v1.5 สำหรับ PDF สแกน
// ---------------------------------------------------------------------------
async function callOcr(buffer: Buffer): Promise<string> {
  const { pdf } = await import("pdf-to-img")
  const pages: string[] = []
  for await (const page of await pdf(buffer, { scale: 2.0 })) {
    pages.push(page.toString("base64"))
    if (pages.length >= 5) break   // สูงสุด 5 หน้าต่อ 1 API call
  }
  if (pages.length === 0) return ""

  const content: ContentPart[] = [
    { type: "text", text: "อ่านข้อความทั้งหมดในเอกสารนี้ ส่งคืนเป็น plain text เท่านั้น ไม่ต้องอธิบายเพิ่ม" },
    ...pages.map((b64) => ({
      type: "image_url" as const,
      image_url: { url: `data:image/png;base64,${b64}` },
    })),
  ]
  return await chat([{ role: "user", content }], 2000, "typhoon-ocr-v1.5")
}

// ---------------------------------------------------------------------------
// Few-shot loader
// ---------------------------------------------------------------------------
function getFewShotMessages(gameType: string): { role: string; content: string }[] {
  try {
    const dir = path.join(process.cwd(), "ai/dataset/rated")
    const files = fs.readdirSync(dir).filter(f => f.endsWith(`_${gameType}.json`))
    if (files.length === 0) return []
    const all = JSON.parse(fs.readFileSync(path.join(dir, files[0]), "utf-8")) as any[]
    const picked = all.slice(0, 3).map((q: any) => ({
      id: q.id, question: "...",
      choices: ["A. ...", "B. ...", "C. ...", "D. ..."],
      correct: q.correct, explanation: "...",
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
// Game prompts
// ---------------------------------------------------------------------------
const GAME_PROMPTS: Record<string, string> = {
  flappy:  "คุณเขียนคำถามสำหรับเกมบิน ต้องสั้นมาก ไม่เกิน 12 คำ ตัวเลือกสั้น 1-4 คำ",
  racer:   "คุณเขียนคำถามสำหรับเกมแข่งรถ คำถามสั้น ไม่เกิน 12 คำ ตัวเลือก 1-4 คำ",
  shooter: "คุณเขียนคำถามสำหรับเกมยิงยาน เน้นระบุตัวตน: 'X คืออะไร?' ตัวเลือกผิดน่าเชื่อถือ",
  snake:   "คุณเขียนคำถามสำหรับเกมงู เน้นลำดับขั้นตอน: 'ขั้นตอนแรกคือ...?' หรือ 'ลำดับต่อไปคือ...?'",
  bricks:  "คุณเขียนคำถามสำหรับเกมตีก้อนหิน เน้นนิยามและศัพท์เทคนิค: 'X หมายความว่าอะไร?'",
}

// ---------------------------------------------------------------------------
// Text cleaning
// ---------------------------------------------------------------------------
// Pre-processing utilities
// ---------------------------------------------------------------------------

/** Base clean — remove encoding artefacts, collapse whitespace */
function baseClean(raw: string): string {
  return raw
    .replace(/\x00/g, "")                          // null bytes (PDF artefact)
    .replace(/\ufffd/g, "")                         // replacement char
    .replace(/\r\n/g, "\n").replace(/\r/g, "\n")   // normalize line endings
    .replace(/[ \t]{2,}/g, " ")                     // collapse spaces/tabs
    .replace(/\n{4,}/g, "\n\n\n")                  // max 3 consecutive newlines
    .trim()
}

/** PDF-specific clean: remove headers, footers, page numbers, TOC lines */
function cleanPdf(raw: string): string {
  const lines = baseClean(raw).split("\n")

  // Count line frequency — lines appearing on many pages are headers/footers
  const freq: Record<string, number> = {}
  for (const l of lines) {
    const k = l.trim().slice(0, 60)
    if (k.length > 3) freq[k] = (freq[k] ?? 0) + 1
  }
  const totalLines = lines.length
  const threshold = Math.max(3, Math.floor(totalLines / 15)) // appears on >1/15 of lines → likely header/footer

  const cleaned = lines.filter(line => {
    const t = line.trim()
    if (!t) return true                              // keep blank lines (paragraph breaks)
    if (/^\d+$/.test(t)) return false               // bare page number
    if (/^(Page|หน้า)\s*\d+/i.test(t)) return false // "Page 3", "หน้า 3"
    if (/^[-–—]+$/.test(t)) return false            // separator lines
    if (/^\.{4,}/.test(t)) return false             // TOC dots "......."
    if (/\s{3,}\d+$/.test(t)) return false          // TOC entry "Chapter 1   ..... 5"
    if (t.length < 4) return false                  // very short fragments
    if ((freq[t.slice(0, 60)] ?? 0) >= threshold) return false // repeated header/footer
    return true
  })

  // Deduplicate consecutive identical paragraphs (slide titles repeated)
  const deduped: string[] = []
  for (let i = 0; i < cleaned.length; i++) {
    const cur = cleaned[i].trim()
    if (cur && cur === cleaned[i - 1]?.trim()) continue
    deduped.push(cleaned[i])
  }

  return deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/** DOCX clean: mammoth output tends to be clean but may have bullet noise */
function cleanDocx(raw: string): string {
  return baseClean(raw)
    .replace(/^[•●▪▸◦]\s*/gm, "- ")               // normalize bullet chars
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** TXT clean: handle Thai encoding edge cases and common noise */
function cleanTxt(raw: string): string {
  return baseClean(raw)
    .replace(/https?:\/\/\S+/g, "")               // remove URLs
    .replace(/[^\S\n]{2,}/g, " ")
    .trim()
}

/** YouTube transcript: merge short fragments into sentences */
function cleanTranscript(raw: string): string {
  return baseClean(raw)
    .replace(/\[.*?\]/g, "")                       // remove [Music], [Applause]
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * Condense large text for AI — hard-cap chunks at 700 chars (safe for Thai ~450 tokens),
 * summarize each, merge back to ~3000 chars
 */
async function condenseText(text: string): Promise<string> {
  const TARGET = 3000
  if (text.length <= TARGET) return text

  // Hard-cap chunks at 700 chars (Thai ≈ 450 tokens — safe within 4096 total budget)
  const CHUNK = 700
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += CHUNK) {
    const c = text.slice(i, i + CHUNK).trim()
    if (c.length > 30) chunks.push(c)
  }

  // Summarize up to 3 chunks IN PARALLEL — enough coverage, saves ~5s vs 5 chunks
  const summaries = await Promise.all(
    chunks.slice(0, 3).map(chunk =>
      chat([
        { role: "system", content: "สรุปเนื้อหาให้กระชับ รักษาคำศัพท์สำคัญไว้ ตอบเป็นภาษาไทย" },
        { role: "user", content: `สรุปเป็น 4-5 ประโยค:\n\n${chunk}` },
      ])
    )
  )

  const merged = summaries.join("\n\n")
  console.log(`[condense] ${text.length} → ${merged.length} chars (${chunks.length} chunks)`)
  return merged.slice(0, TARGET)
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------
async function fetchGoogleDrive(url: string): Promise<string> {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) throw new Error("ไม่พบ ID ใน Google Drive URL")
  const id = match[1]
  const candidates = [
    `https://docs.google.com/document/d/${id}/export?format=txt`,
    `https://docs.google.com/presentation/d/${id}/export/txt`,
    `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`,
  ]
  for (const u of candidates) {
    try {
      const res = await fetch(u, { redirect: "follow" })
      if (res.ok) return cleanTxt(await res.text()).slice(0, 6000)
    } catch { /* try next */ }
  }
  throw new Error("เข้าถึง Google Drive ไม่ได้ — ตรวจสอบว่าเปิดแชร์แบบ 'ทุกคนที่มีลิงก์'")
}

async function fetchYouTubeTranscript(url: string): Promise<string> {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)
  if (!match) throw new Error("ไม่พบ Video ID ใน YouTube URL")
  const { YoutubeTranscript } = await import("youtube-transcript")
  const items = await YoutubeTranscript.fetchTranscript(match[1])
  if (!items || items.length === 0) throw new Error("วิดีโอนี้ไม่มี transcript")
  return cleanTranscript(items.map(t => t.text).join(" ")).slice(0, 6000)
}

// ---------------------------------------------------------------------------
// File → text
// ---------------------------------------------------------------------------
async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const type = file.type
  const name = file.name.toLowerCase()

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const { extractText: unpdfExtract } = await import("unpdf")
    // Suppress PDF.js font warnings (TT: undefined function, etc.) — cosmetic only
    const _warn = console.warn
    console.warn = (...args: unknown[]) => {
      const msg = String(args[0] ?? "")
      if (/TT:|undefined function|Type1|glyph|CMap/i.test(msg)) return
      _warn(...args)
    }
    let text = ""
    try {
      const result = await unpdfExtract(new Uint8Array(buffer), { mergePages: true })
      text = result.text ?? ""
    } finally {
      console.warn = _warn
    }
    const cleaned = cleanPdf(text)
    if (cleaned.length < 300) {
      console.log("[OCR] text too short, trying typhoon-ocr-v1.5 ...")
      try {
        const ocrText = await callOcr(buffer)
        if (ocrText.trim().length > 100) return cleanPdf(ocrText).slice(0, 12000)
      } catch (e) {
        console.error("[OCR] failed:", e)
      }
    }
    return cleaned.slice(0, 12000)
  }
  if (type.includes("wordprocessingml") || name.endsWith(".docx")) {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return cleanDocx(result.value).slice(0, 12000)
  }
  return cleanTxt(buffer.toString("utf-8")).slice(0, 12000)
}

// ---------------------------------------------------------------------------
// Agent 1: Summarizer
// ---------------------------------------------------------------------------
async function summarize(text: string): Promise<string[]> {
  const raw = await chat([
    { role: "system", content: "คุณเป็นผู้สรุปเนื้อหาการศึกษา ตอบด้วย JSON เท่านั้น" },
    { role: "user", content: `สรุปเนื้อหาต่อไปนี้เป็น 6-8 ประเด็นสำคัญเป็นภาษาไทย\nตอบ JSON เท่านั้น: {"bullets":["...","..."]}\n\n${text}` },
  ], 500)

  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()
  try {
    const parsed = JSON.parse(cleaned)
    const bullets = Array.isArray(parsed) ? parsed : (parsed?.bullets ?? [])
    return (bullets as string[]).filter((b: string) => b.length > 5).slice(0, 8)
  } catch {
    return raw.split("\n").map(l => l.replace(/^[-•*\d.]+\s*/, "").trim()).filter(Boolean).slice(0, 8)
  }
}

// ---------------------------------------------------------------------------
// Agent 2: Question Generator
// ---------------------------------------------------------------------------
async function generateQuestions(text: string, gameType?: string) {
  const gameHint = gameType && GAME_PROMPTS[gameType] ? GAME_PROMPTS[gameType] : ""
  const systemPrompt = gameHint
    ? `${gameHint}\n\nตอบด้วย JSON object ที่มี key "questions" เท่านั้น ไม่มี markdown`
    : "คุณเป็นผู้เชี่ยวชาญออกข้อสอบ ตอบ JSON เท่านั้น"
  const fewShot = gameType ? getFewShotMessages(gameType) : []

  const raw = await chat([
    { role: "system", content: systemPrompt },
    ...fewShot,
    {
      role: "user",
      content: `สร้างคำถามแบบเลือกตอบ 10 ข้อจากเนื้อหา

กฎ:
- คำถามและตัวเลือกเป็นภาษาไทยทั้งหมด
- 4 ตัวเลือกต่อข้อ คำตอบถูก 1 ข้อ ห้ามมีตัวอักษร A. B. C. D. นำหน้าตัวเลือก
- คำอธิบายไม่เกิน 15 คำ ภาษาไทย
- fields เท่านั้น: id, question, choices, correct, explanation, difficulty
- difficulty 1/2/3 กระจาย 3/5/2

ตอบ JSON เท่านั้น:
{"questions":[{"id":1,"question":"...","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4"],"correct":0,"explanation":"...","difficulty":1}]}

เนื้อหา:
${text}`,
    },
  ], 2000)

  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim()

  // Strip "A. " / "ก. " prefixes the AI sometimes adds despite instructions
  const stripChoicePrefix = (q: any) => {
    if (Array.isArray(q?.choices)) {
      q.choices = q.choices.map((c: string) =>
        typeof c === "string" ? c.replace(/^[A-Dก-ง][.)]\s*/, "") : c
      )
    }
    return q
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed.map(stripChoicePrefix)
    if (Array.isArray(parsed?.questions)) return parsed.questions.map(stripChoicePrefix)
  } catch (e) {
    console.error("[generateQuestions] parse failed:", String(e).slice(0, 200))
    // Fallback regex recovery
    const objects: unknown[] = []
    const re = /\{[^{}]*"id"\s*:\s*\d+[^{}]*"correct"\s*:\s*\d[^{}]*\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(cleaned)) !== null) {
      try { objects.push(JSON.parse(m[0])) } catch { /* skip */ }
    }
    if (objects.length >= 3) return objects
  }
  return null
}

// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? ""
    let rawText: string
    let gameType: string | undefined

    if (contentType.includes("application/json")) {
      const body = await req.json() as { text?: string; gameType?: string; url?: string; urlType?: string }

      if (body.url && body.urlType) {
        if (body.urlType === "gdrive") {
          rawText = await fetchGoogleDrive(body.url)
        } else if (body.urlType === "youtube") {
          rawText = await fetchYouTubeTranscript(body.url)
        } else {
          return NextResponse.json({ error: "Unknown urlType" }, { status: 400 })
        }
        if (!rawText || rawText.trim().length < 50) {
          return NextResponse.json({ error: "ดึงเนื้อหาไม่ได้ หรือเนื้อหาน้อยเกินไป" }, { status: 422 })
        }
      } else {
        if (!body.text || body.text.trim().length < 50) {
          return NextResponse.json({ error: "ไม่มีเนื้อหา" }, { status: 400 })
        }
        rawText = cleanTxt(body.text).slice(0, 12000)
        gameType = body.gameType
      }
    } else {
      const form = await req.formData()
      const file = form.get("file") as File | null
      gameType = (form.get("gameType") as string | null) ?? undefined
      if (!file) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })
      rawText = await extractText(file)
      if (!rawText || rawText.trim().length < 50) {
        return NextResponse.json({ error: "ไม่สามารถดึงข้อความจากไฟล์ได้" }, { status: 422 })
      }
    }

    // Condense large text (PDF 20-30 pages) before sending to AI
    const text = await condenseText(rawText)
    console.log(`[generate] text length: ${rawText.length} → condensed: ${text.length}`)

    // Re-generate mode (single game)
    if (gameType) {
      const questions = await generateQuestions(text, gameType)
      if (!questions) return NextResponse.json({ error: "สร้างข้อสอบไม่สำเร็จ" }, { status: 500 })
      return NextResponse.json({ questions, gameType })
    }

    // Initial upload — summary + 5 game variants in parallel
    const [summaryBullets, flappy, racer, shooter, snake, bricks] = await Promise.all([
      summarize(text),
      generateQuestions(text, "flappy"),
      generateQuestions(text, "racer"),
      generateQuestions(text, "shooter"),
      generateQuestions(text, "snake"),
      generateQuestions(text, "bricks"),
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
