import { NextRequest } from "next/server"
import OpenAI from "openai"

function getClient() {
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1",
    apiKey: process.env.AI_API_KEY ?? "none",
  })
}

const MODEL = process.env.AI_MODEL ?? "llama-3.1-8b-instant"

// ---------------------------------------------------------------------------
// Agent 3: AI Mentor Chat (streaming)
// POST /api/chat
// Body: { messages: [{role, content}], contextText?: string }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { messages, contextText } = await req.json()

    const client = getClient()

    const systemPrompt = contextText
      ? `You are KU AI Mentor — a friendly, knowledgeable academic tutor for Kasetsart University students.
Your role is to help students understand the study material they uploaded.

Study Material Context:
---
${contextText.slice(0, 6000)}
---

Answer questions clearly and accurately based on the study material above.
If the question is not related to the material, still answer helpfully.
Use the same language the student uses (Thai or English).`
      : `You are KU AI Mentor — a friendly, knowledgeable academic tutor for Kasetsart University students.
Help students understand academic concepts clearly. Use the same language the student uses (Thai or English).`

    const stream = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    })

    // Stream the response as Server-Sent Events
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ""
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    })
  } catch (err) {
    console.error("[/api/chat]", err)
    return new Response(
      err instanceof Error ? err.message : "Internal server error",
      { status: 500 }
    )
  }
}
