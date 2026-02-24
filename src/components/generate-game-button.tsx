"use client"

import { useState } from "react"
import { useQuestions } from "@/lib/questions-context"
import type { QuizQuestion } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface Props {
  gameType: string
  label: string
}

export function GenerateGameButton({ gameType, label }: Props) {
  const { uploadedText, setQuestions } = useQuestions()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!uploadedText) return null

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadedText, gameType }),
      })
      const data = await res.json() as { questions?: QuizQuestion[]; error?: string }
      if (res.ok && Array.isArray(data.questions)) {
        setQuestions(data.questions)
        setDone(true)
      } else {
        setError(data.error ?? "Failed to generate questions")
      }
    } catch {
      setError("Network error — check connection")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-1">
      <Button
        onClick={handleGenerate}
        disabled={loading}
        variant="outline"
        className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 min-h-11"
      >
        <Sparkles className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
        {loading
          ? "Generating…"
          : done
          ? `${label} questions ready ✓`
          : `Generate ${label} Questions`}
      </Button>
      {error && (
        <p className="text-[10px] text-destructive text-center">{error}</p>
      )}
    </div>
  )
}
