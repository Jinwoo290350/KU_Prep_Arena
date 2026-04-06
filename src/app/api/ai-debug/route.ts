import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  const BASE  = process.env.AI_BASE_URL  ?? "https://api.opentyphoon.ai/v1"
  const KEY   = process.env.AI_API_KEY   ?? ""
  const MODEL = process.env.AI_MODEL     ?? "typhoon-v2-70b-instruct"

  // 1. List models
  const modelsRes = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${KEY}` },
  }).catch(e => ({ ok: false, status: 0, text: async () => String(e) } as any))
  const modelsBody = await modelsRes.text()

  // 2. Minimal chat completion
  const chatRes = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "hi" }],
    }),
  }).catch(e => ({ ok: false, status: 0, text: async () => String(e) } as any))
  const chatBody = await chatRes.text()

  return NextResponse.json({
    config: { base_url: BASE, model: MODEL, key_set: !!KEY && KEY !== "none" && KEY.length > 5 },
    models: { status: modelsRes.status, body: modelsBody.slice(0, 800) },
    chat:   { status: chatRes.status,   body: chatBody.slice(0, 800) },
  })
}
