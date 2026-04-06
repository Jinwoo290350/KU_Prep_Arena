import { NextRequest } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"
export const maxDuration = 60

function getClient() {
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? "https://api.opentyphoon.ai/v1",
    apiKey: process.env.AI_API_KEY ?? "none",
  })
}

const MODEL = process.env.AI_MODEL ?? "typhoon-v2-70b-instruct"

export async function POST(req: NextRequest) {
  try {
    const { messages, contextText } = await req.json()

    const client = getClient()

    const systemPrompt = contextText
      ? `คุณคือ KU AI Mentor — ผู้ช่วยติวและอธิบายบทเรียนสำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์
ตอบเป็นภาษาไทยเสมอ ยกเว้นเมื่อนิสิตถามเป็นภาษาอังกฤษ
อธิบายให้ชัดเจน กระชับ ใช้ตัวอย่างที่เข้าใจง่าย

เนื้อหาการเรียนที่อัพโหลด:
---
${contextText.slice(0, 8000)}
---

ตอบคำถามโดยอิงจากเนื้อหาด้านบน ถ้าคำถามไม่เกี่ยวกับเนื้อหา ก็ตอบได้ตามปกติ`
      : `คุณคือ KU AI Mentor — ผู้ช่วยติวและอธิบายบทเรียนสำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์
ตอบเป็นภาษาไทยเสมอ ยกเว้นเมื่อนิสิตถามเป็นภาษาอังกฤษ
อธิบายให้ชัดเจน กระชับ ใช้ตัวอย่างที่เข้าใจง่าย`

    const stream = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ""
            if (text) controller.enqueue(encoder.encode(text))
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
