"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { QuizQuestion } from "@/lib/mock-data"
import { useQuestions } from "@/lib/questions-context"
import { ArrowLeft, Zap, Heart, Clock, RotateCcw, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Mode = "timeattack" | "survival" | "checkpoint"
type Phase = "select" | "playing" | "feedback" | "result"

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const MODE_INFO: Record<Mode, { label: string; desc: string }> = {
  timeattack: { label: "Time Attack", desc: "Answer as many as you can before time runs out" },
  survival: { label: "Survival", desc: "3 strikes and you are out" },
  checkpoint: { label: "Checkpoint", desc: "Each correct answer adds time" },
}

export function QuizBlitzContent() {
  const { questions: uploadedQuestions } = useQuestions()
  const [phase, setPhase] = useState<Phase>("select")
  const [mode, setMode] = useState<Mode>("timeattack")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [lives, setLives] = useState(3)
  const [timer, setTimer] = useState(60)
  const [selected, setSelected] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentQ = questions[qIdx] || null

  const startQuiz = useCallback((m: Mode) => {
    setMode(m)
    if (!uploadedQuestions.length) return
    setQuestions(shuffled(uploadedQuestions))
    setQIdx(0)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setLives(3)
    setTimer(m === "timeattack" ? 60 : m === "checkpoint" ? 30 : 999)
    setSelected(null)
    setShowExplanation(false)
    setPhase("playing")
  }, [])

  // Timer
  useEffect(() => {
    if (phase !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          setPhase("result")
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const handleAnswer = useCallback((choiceIdx: number) => {
    if (selected !== null) return
    setSelected(choiceIdx)
    setShowExplanation(true)
    setPhase("feedback")

    const isCorrect = choiceIdx === currentQ?.correct
    if (isCorrect) {
      const pts = 10 + combo * 5
      setScore((s) => s + pts)
      setCombo((c) => {
        const next = c + 1
        setBestCombo((b) => Math.max(b, next))
        return next
      })
      if (mode === "checkpoint") setTimer((t) => t + 5)
    } else {
      setCombo(0)
      if (mode === "survival") {
        setLives((l) => {
          if (l <= 1) {
            setTimeout(() => setPhase("result"), 1200)
            return 0
          }
          return l - 1
        })
      }
    }
  }, [selected, currentQ, combo, mode])

  const nextQ = useCallback(() => {
    if (qIdx + 1 >= questions.length) {
      setPhase("result")
      return
    }
    setQIdx((i) => i + 1)
    setSelected(null)
    setShowExplanation(false)
    setPhase("playing")
  }, [qIdx, questions.length])

  const xpEarned = score * 2

  if (phase === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/arena">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Quiz Blitz</h1>
            <p className="text-xs text-muted-foreground">Choose your mode</p>
          </div>
        </div>
        {!uploadedQuestions.length ? (
          <div className="glass-card rounded-xl p-8 text-center border border-dashed border-border">
            <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-foreground mb-1">No study material uploaded</p>
            <p className="text-xs text-muted-foreground">Upload a PDF or TXT from the sidebar to generate quiz questions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => startQuiz(m)}
                className="glass-card rounded-xl p-6 text-left hover:border-ku-lime/30 transition-all group cursor-pointer"
              >
                <Zap className="h-6 w-6 text-ku-lime mb-3" />
                <p className="text-base font-bold text-foreground mb-1">{MODE_INFO[m].label}</p>
                <p className="text-xs text-muted-foreground">{MODE_INFO[m].desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (phase === "result") {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="glass-card rounded-xl p-8 text-center">
          <Zap className="h-12 w-12 text-ku-gold mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Quiz Complete!</h2>
          <p className="text-sm text-muted-foreground mb-6">{MODE_INFO[mode].label} Mode</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-ku-lime">{score}</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-ku-gold">{bestCombo}x</p>
              <p className="text-xs text-muted-foreground">Best Combo</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-foreground">+{xpEarned}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => startQuiz(mode)} className="flex-1 btn-ku-green text-foreground">
              <RotateCcw className="h-4 w-4 mr-2" />Play Again
            </Button>
            <Link href="/arena" className="flex-1">
              <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary">
                Back to Arena
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/arena">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Quiz Blitz - {MODE_INFO[mode].label}</h1>
        </div>
        <div className="flex items-center gap-3">
          {mode === "survival" && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart key={i} className={`h-4 w-4 ${i < lives ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
              ))}
            </div>
          )}
          {mode !== "survival" && (
            <div className="flex items-center gap-1 text-ku-gold">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-bold font-mono">{timer}s</span>
            </div>
          )}
          {combo > 1 && (
            <Badge className="bg-ku-gold/20 text-ku-gold border-ku-gold/30">
              {combo}x combo
            </Badge>
          )}
        </div>
      </div>

      {/* Timer bar */}
      {mode !== "survival" && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${(timer / (mode === "timeattack" ? 60 : 30)) * 100}%`,
              background: timer > 10 ? "linear-gradient(90deg, #336600, #7bc043)" : "#ef4444",
            }}
          />
        </div>
      )}

      {/* Question */}
      {currentQ && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              Q{qIdx + 1}/{questions.length}
            </Badge>
            <span className="text-sm font-bold text-ku-lime">{score} pts</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-6">{currentQ.question}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.choices.map((choice, i) => {
              const letter = ["A", "B", "C", "D"][i]
              let btnClass = "glass-card rounded-lg p-4 text-left transition-all cursor-pointer flex items-start gap-3"
              if (selected !== null) {
                if (i === currentQ.correct) btnClass += " border-ku-lime/50 bg-ku-lime/10"
                else if (i === selected) btnClass += " border-destructive/50 bg-destructive/10"
                else btnClass += " opacity-50"
              } else {
                btnClass += " hover:border-ku-lime/30"
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selected !== null}
                  className={btnClass}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-foreground text-xs font-bold shrink-0">
                    {letter}
                  </span>
                  <span className="text-sm text-foreground mt-0.5">{choice}</span>
                  {selected !== null && i === currentQ.correct && (
                    <CheckCircle2 className="h-5 w-5 text-ku-lime ml-auto shrink-0 mt-0.5" />
                  )}
                  {selected === i && i !== currentQ.correct && (
                    <XCircle className="h-5 w-5 text-destructive ml-auto shrink-0 mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Explanation */}
      {showExplanation && currentQ && (
        <div className="glass-card rounded-xl p-5">
          <p className="text-xs font-semibold text-ku-gold uppercase tracking-wider mb-2">Explanation</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{currentQ.explanation}</p>
          <Button onClick={nextQ} className="mt-4 btn-ku-green text-foreground">
            Next Question
          </Button>
        </div>
      )}
    </div>
  )
}
