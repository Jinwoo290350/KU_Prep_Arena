"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Swords,
  Timer,
  Heart,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Flag,
  Zap,
  Trophy,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useQuestions } from "@/lib/questions-context"

type GameMode = "solo" | "battle"
type SoloMode = "time-attack" | "survival" | "checkpoint"
type Difficulty = "easy" | "medium" | "hard"
type GameState = "setup" | "playing" | "result"

const TIME_LIMITS: Record<Difficulty, number> = { easy: 15, medium: 8, hard: 5 }

export function QuizBattleContent() {
  const router = useRouter()
  const { questions: uploadedQuestions, uploadedFileName } = useQuestions()
  const [gameState, setGameState] = useState<GameState>("setup")
  const [gameMode, setGameMode] = useState<GameMode>("solo")
  const [soloMode, setSoloMode] = useState<SoloMode>("time-attack")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const diffLevel = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3
  const filtered = uploadedQuestions.filter(q => !q.difficulty || q.difficulty === diffLevel)
  const activeQuestions = filtered.length >= 3 ? filtered : uploadedQuestions
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [selected, setSelected] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [totalCorrect, setTotalCorrect] = useState(0)

  const question = activeQuestions[currentQuestion]

  const handleTimeout = useCallback(() => {
    if (soloMode === "survival") {
      setLives((l) => l - 1)
      if (lives <= 1) {
        setGameState("result")
        return
      }
    }
    setSelected(-1)
    setShowExplanation(true)
  }, [soloMode, lives])

  useEffect(() => {
    if (gameState !== "playing" || showExplanation) return
    if (timeLeft <= 0) {
      handleTimeout()
      return
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft, gameState, showExplanation, handleTimeout])

  const startGame = () => {
    if (gameMode === "battle") {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      router.push(`/quiz-battle/host/${code}`)
      return
    }
    setGameState("playing")
    setCurrentQuestion(0)
    setScore(0)
    setLives(3)
    setSelected(null)
    setShowExplanation(false)
    setTotalCorrect(0)
    setTimeLeft(TIME_LIMITS[difficulty])
  }

  const handleAnswer = (idx: number) => {
    if (selected !== null) return
    setSelected(idx)
    setShowExplanation(true)
    if (idx === question.correct) {
      const points = Math.max(10, timeLeft * 5)
      setScore((s) => s + points)
      setTotalCorrect((t) => t + 1)
    } else if (soloMode === "survival") {
      setLives((l) => l - 1)
      if (lives <= 1) {
        setTimeout(() => setGameState("result"), 1500)
        return
      }
    }
  }

  const nextQuestion = () => {
    if (currentQuestion >= activeQuestions.length - 1) {
      setGameState("result")
      return
    }
    setCurrentQuestion((q) => q + 1)
    setSelected(null)
    setShowExplanation(false)
    setTimeLeft(TIME_LIMITS[difficulty])
  }

  if (gameState === "setup") {
    return <SetupScreen
      gameMode={gameMode}
      setGameMode={setGameMode}
      soloMode={soloMode}
      setSoloMode={setSoloMode}
      difficulty={difficulty}
      setDifficulty={setDifficulty}
      onStart={startGame}
      hasQuestions={!!uploadedQuestions.length}
      questionCount={uploadedQuestions.length}
      uploadedFileName={uploadedFileName}
    />
  }

  if (gameState === "result") {
    return <ResultScreen score={score} totalCorrect={totalCorrect} total={activeQuestions.length} onRestart={() => setGameState("setup")} />
  }

  const timerMax = TIME_LIMITS[difficulty]
  const timerPercent = (timeLeft / timerMax) * 100

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Game HUD */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border gap-1">
            <Zap className="h-3 w-3 text-primary" />
            {score} pts
          </Badge>
          <span className="text-xs text-muted-foreground">
            {"Q" + (currentQuestion + 1) + "/" + activeQuestions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {soloMode === "survival" && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={cn("h-4 w-4", i < lives ? "text-destructive fill-destructive" : "text-muted-foreground")}
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Timer className={cn("h-4 w-4", timeLeft <= 5 ? "text-destructive" : "text-primary")} />
            <span className={cn("text-sm font-mono font-bold", timeLeft <= 5 ? "text-destructive" : "text-foreground")}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            timeLeft <= 5 ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Question Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg leading-relaxed">{question.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {question.choices.map((choice, idx) => {
              const isSelected = selected === idx
              const isCorrect = idx === question.correct
              const showResult = showExplanation

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selected !== null}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-all border",
                    showResult && isCorrect
                      ? "bg-accent/10 border-accent text-foreground"
                      : showResult && isSelected && !isCorrect
                      ? "bg-destructive/10 border-destructive text-foreground"
                      : isSelected
                      ? "bg-primary/10 border-primary text-foreground"
                      : "bg-secondary/50 border-border text-foreground hover:bg-secondary hover:border-primary/30"
                  )}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{choice}</span>
                  {showResult && isCorrect && <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className="mt-4 glass-card rounded-xl p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">AI Explanation</p>
              <p className="text-sm text-foreground leading-relaxed">{question.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
              <Flag className="h-4 w-4" />
              Report
            </Button>
            {showExplanation && (
              <Button onClick={nextQuestion} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
                {currentQuestion < activeQuestions.length - 1 ? "Next Question" : "See Results"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SetupScreen({
  gameMode,
  setGameMode,
  soloMode,
  setSoloMode,
  difficulty,
  setDifficulty,
  onStart,
  hasQuestions,
  questionCount,
  uploadedFileName,
}: {
  gameMode: GameMode
  setGameMode: (m: GameMode) => void
  soloMode: SoloMode
  setSoloMode: (m: SoloMode) => void
  difficulty: Difficulty
  setDifficulty: (d: Difficulty) => void
  onStart: () => void
  hasQuestions: boolean
  questionCount: number
  uploadedFileName: string | null
}) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Swords className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">AI Quiz Battle</h1>
        </div>
        <p className="text-muted-foreground">Test your knowledge with AI-generated questions</p>
      </div>

      {/* Material Status */}
      {hasQuestions ? (
        <div className="glass-card rounded-xl p-4 border-l-4 border-primary flex items-center gap-3">
          <ChevronRight className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Study material ready</p>
            <p className="text-xs text-muted-foreground truncate">{uploadedFileName} · {questionCount} questions</p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 shrink-0">
            Ready
          </Badge>
        </div>
      ) : null}

      {/* Mode Selection */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base">Game Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setGameMode("solo")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl p-4 border transition-all",
                gameMode === "solo" ? "border-primary bg-primary/10 glow-primary" : "border-border bg-secondary/50 hover:border-primary/30"
              )}
            >
              <Zap className={cn("h-6 w-6", gameMode === "solo" ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-sm font-semibold", gameMode === "solo" ? "text-foreground" : "text-muted-foreground")}>Solo Quest</span>
            </button>
            <button
              onClick={() => setGameMode("battle")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl p-4 border transition-all",
                gameMode === "battle" ? "border-accent bg-accent/10 glow-neon" : "border-border bg-secondary/50 hover:border-accent/30"
              )}
            >
              <Swords className={cn("h-6 w-6", gameMode === "battle" ? "text-accent" : "text-muted-foreground")} />
              <span className={cn("text-sm font-semibold", gameMode === "battle" ? "text-foreground" : "text-muted-foreground")}>Real-time Battle</span>
            </button>
          </div>

          {/* Solo modes */}
          {gameMode === "solo" && (
            <div className="flex flex-col gap-3 mb-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Solo Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "time-attack", label: "Time Attack", icon: Timer },
                  { key: "survival", label: "Survival", icon: Heart },
                  { key: "checkpoint", label: "Checkpoint", icon: CheckCircle2 },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSoloMode(key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg p-3 border text-xs font-medium transition-all",
                      soloMode === key ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 px-1 min-h-7">
                {soloMode === "time-attack" && "Race the clock — faster answers score more points!"}
                {soloMode === "survival" && "3 lives: wrong answer or timeout costs a life."}
                {soloMode === "checkpoint" && "3 consecutive correct → checkpoint saved. Wrong answer → back to checkpoint."}
              </p>
            </div>
          )}

          {/* Difficulty */}
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "easy", label: "Easy", color: "text-accent" },
                { key: "medium", label: "Medium", color: "text-warning" },
                { key: "hard", label: "Hard", color: "text-destructive" },
              ] as const).map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className={cn(
                    "rounded-lg py-2 px-3 border text-sm font-medium transition-all",
                    difficulty === key
                      ? `border-current bg-current/10 ${color}`
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onStart}
        disabled={!hasQuestions}
        size="lg"
        className="bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Swords className="h-5 w-5 mr-2" />
        {hasQuestions
          ? (gameMode === "solo" ? "Start Solo Quest" : "Create Battle Room")
          : "Upload material first"}
      </Button>
    </div>
  )
}

function ResultScreen({
  score,
  totalCorrect,
  total,
  onRestart,
}: {
  score: number
  totalCorrect: number
  total: number
  onRestart: () => void
}) {
  const percentage = Math.round((totalCorrect / total) * 100)
  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto py-12">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 glow-primary">
        <Trophy className="h-10 w-10 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-1">Quest Complete!</h2>
        <p className="text-muted-foreground">Here{"'"}s how you did</p>
      </div>
      <div className="glass-card rounded-2xl p-6 w-full">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{score}</p>
            <p className="text-xs text-muted-foreground">Points</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">{totalCorrect}/{total}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">{percentage}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-accent">
        <Zap className="h-4 w-4" />
        <span className="font-semibold">{"+" + score + " XP earned!"}</span>
      </div>
      <Button onClick={onRestart} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
        <RotateCcw className="h-4 w-4" />
        Play Again
      </Button>
    </div>
  )
}
