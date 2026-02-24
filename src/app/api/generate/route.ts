import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

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
    return (text ?? "").slice(0, 12000)
  }

  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value.slice(0, 12000)
  }

  // Plain text
  return buffer.toString("utf-8").slice(0, 12000)
}

// ---------------------------------------------------------------------------
// Agent 1: Summarizer
// ---------------------------------------------------------------------------
async function summarize(client: OpenAI, text: string): Promise<string[]> {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          `You are an expert academic summarizer. Respond only with a JSON array of strings — no markdown, no extra text. ${NO_CHINESE}`,
      },
      {
        role: "user",
        content: `Summarize the following study material into 6-8 concise bullet points that capture the most important concepts.

CRITICAL RULES:
- Write ONLY in the SAME language as the document below (Thai = ภาษาไทย, English = English)
- Do NOT translate — mirror the document's language exactly
- Do NOT use Chinese (中文), Japanese, Korean, or any other language
- Return ONLY a JSON array of strings: ["point 1", "point 2", ...]

Document:
${text}`,
      },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? "[]"
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as string[]
  } catch {
    // fallback: split by newline
    return raw
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8)
  }
  return []
}

// ---------------------------------------------------------------------------
// Agent 2: Question Generator (game-type aware)
// ---------------------------------------------------------------------------
async function generateQuestions(client: OpenAI, text: string, gameType?: string) {
  const gameHint = gameType && GAME_PROMPTS[gameType] ? GAME_PROMPTS[gameType] : ""
  const systemPrompt = gameHint
    ? `${gameHint}\n\nRespond ONLY with a valid JSON array — no markdown fences, no explanation.`
    : DEFAULT_GAME_PROMPT

  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Create exactly 10 multiple-choice questions from the study material below.
Rules:
- CRITICAL: Write ONLY in the same language as the document (Thai or English). NEVER use Chinese, Japanese, Korean, or any other language.
- Each question must have exactly 4 choices
- Only 1 correct answer per question
- Include a brief explanation for the correct answer

Return ONLY a JSON array in this exact format:
[
  {
    "id": 1,
    "question": "...",
    "choices": ["A text", "B text", "C text", "D text"],
    "correct": 0,
    "explanation": "..."
  }
]
("correct" is 0-based index: 0=A, 1=B, 2=C, 3=D)

Study Material:
${text}`,
      },
    ],
  })

  const raw = res.choices[0]?.message?.content?.trim() ?? "[]"

  // Strip possible markdown code fences
  const cleaned = raw
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
  } catch {
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
      // Re-generate mode: client sends stored extracted text + gameType
      const body = await req.json() as { text?: string; gameType?: string }
      if (!body.text || body.text.trim().length < 50) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 })
      }
      text = body.text.slice(0, 12000)
      gameType = body.gameType ?? undefined
    } else {
      // File upload mode
      const form = await req.formData()
      const file = form.get("file") as File | null
      gameType = (form.get("gameType") as string | null) ?? undefined

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      // Agent 0: extract text
      text = await extractText(file)

      if (!text || text.trim().length < 50) {
        return NextResponse.json({ error: "Could not extract text from file" }, { status: 422 })
      }
    }

    const client = getClient()

    // For re-generate (JSON mode with gameType), skip summarizer to save tokens
    if (gameType) {
      const questions = await generateQuestions(client, text, gameType)
      if (!questions) {
        return NextResponse.json({ error: "Failed to parse AI question response" }, { status: 500 })
      }
      return NextResponse.json({ questions, gameType })
    }

    // Initial upload: run summarizer + default question generator in parallel
    const [summaryBullets, questions] = await Promise.all([
      summarize(client, text),
      generateQuestions(client, text),
    ])

    if (!questions) {
      return NextResponse.json({ error: "Failed to parse AI question response" }, { status: 500 })
    }

    return NextResponse.json({
      questions,
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
