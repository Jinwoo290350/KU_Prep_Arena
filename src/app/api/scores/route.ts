import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAdminClient } from "@/lib/supabase"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("scores")
    .select("game_id, score")
    .eq("user_email", session.user.email)
    .order("score", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by game_id, take MAX score per game
  const bestScores: Record<string, number> = {}
  for (const row of data ?? []) {
    const current = bestScores[row.game_id] ?? 0
    if (row.score > current) {
      bestScores[row.game_id] = row.score
    }
  }

  return NextResponse.json({ bestScores })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { game_id, score } = body as { game_id: string; score: number }

  if (!game_id || typeof score !== "number") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("scores").insert({
    user_email: session.user.email,
    game_id,
    score,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
