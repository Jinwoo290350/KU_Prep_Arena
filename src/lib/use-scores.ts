"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

export const GAME_LABELS: Record<string, string> = {
  flappy: "Flappy Kaset",
  racer: "Speed Racer",
  shooter: "Space Shooter",
  snake: "Snake Quiz",
  bricks: "Brick Breaker",
}

export interface GameScore {
  game: string
  score: number
  date: string // ISO string
}

function loadLocalScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem("ku-scores") ?? "{}")
  } catch {
    return {}
  }
}

export function useScores() {
  const { data: session } = useSession()
  const [bestScores, setBestScores] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!session?.user?.email) {
      // Fall back to localStorage when not signed in
      setBestScores(loadLocalScores())
      return
    }

    fetch("/api/scores")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.bestScores) {
          setBestScores(data.bestScores)
        }
      })
      .catch(() => {
        // Fall back to localStorage on error
        setBestScores(loadLocalScores())
      })
  }, [session?.user?.email])

  const recordScore = useCallback(
    (game: string, score: number) => {
      setBestScores((prev) => {
        const current = prev[game] ?? 0
        if (score <= current) return prev
        const next = { ...prev, [game]: score }

        if (session?.user?.email) {
          // Persist to API
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ game_id: game, score }),
          }).catch(() => {
            // Ignore network errors silently
          })
        } else {
          // Fall back to localStorage
          localStorage.setItem("ku-scores", JSON.stringify(next))
        }

        return next
      })
    },
    [session?.user?.email]
  )

  return { bestScores, recordScore }
}
