"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useQuestions } from "@/lib/questions-context"
import { useScores } from "@/lib/use-scores"
import type { QuizQuestion } from "@/lib/mock-data"
import { ArrowLeft, RotateCcw, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GenerateGameButton } from "@/components/generate-game-button"

// ─── Constants ───────────────────────────────────────────────────────────────
const COLS = 18
const ROWS = 18
const CELL = 28
const CW = COLS * CELL
const CH = ROWS * CELL
const TICK_MS_BASE = 250
const LABELS = ["A", "B", "C", "D"]
const FOOD_COLS = ["#3b82f6", "#f97316", "#a855f7", "#ef4444"]
const MAX_LIVES = 3

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT"
type State = "pregame" | "playing" | "dead" | "result"
interface Pt { x: number; y: number }
interface Food { x: number; y: number; choiceIdx: number }

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

function rndCell(exclude: Pt[]): Pt {
  let p: Pt
  do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
  while (exclude.some(e => e.x === p.x && e.y === p.y))
  return p
}

function spawnFoods(q: QuizQuestion, snake: Pt[]): Food[] {
  const used: Pt[] = [...snake]
  return [0, 1, 2, 3].map((i) => {
    const p = rndCell(used)
    used.push(p)
    return { ...p, choiceIdx: i }
  })
}

function PreGame({ onStart, hasQuestions }: { onStart: () => void; hasQuestions: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
      <div className="text-6xl float-anim">🐍</div>
      <div>
        <h2 className="text-xl font-black text-foreground">KU Snake Quiz</h2>
        <p className="text-sm text-muted-foreground mt-1">Guide the snake to eat the correct food. Wrong food = game over!</p>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">Controls</p>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">↑ ↓ ← →</kbd> or <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">WASD</kbd> — Steer snake</p>
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">Swipe</kbd> — Steer (mobile)</p>
        </div>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">How to play</p>
        <ol className="flex flex-col gap-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>Read the question shown above the grid</li>
          <li>4 food items appear on the grid — A, B, C, D</li>
          <li>Navigate the snake to eat the correct food</li>
          <li>Eating correct food = snake grows + next question</li>
          <li>Wrong food or hitting wall/self = game over</li>
        </ol>
      </div>
      {!hasQuestions ? (
        <div className="w-full rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">Upload study material to generate questions.</p>
          <Link href="/arena"><Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Go to Hub</Button></Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <GenerateGameButton gameType="snake" label="Snake Quiz" />
          <Button onClick={onStart} className="w-full btn-ku-green text-base font-bold py-3 min-h-12 pulse-green">START GAME</Button>
        </div>
      )}
    </div>
  )
}

function PostGame({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const grade = pct >= 90 ? "S" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "D"
  const gc = pct >= 90 ? "#f5c518" : pct >= 75 ? "#22c55e" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f97316" : "#ef4444"
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-5 text-center max-w-sm mx-auto">
      <div className="flex h-20 w-20 items-center justify-center rounded-full text-4xl font-black"
        style={{ background: gc + "22", color: gc, border: `3px solid ${gc}` }}>{grade}</div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Final Score</p>
        <p className="text-4xl font-black text-foreground">{score}</p>
      </div>
      <div className="w-full grid grid-cols-3 gap-3">
        {[["Answered", total], ["Accuracy", `${pct}%`], ["XP", `+${score * 16}`]].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl bg-secondary/60 p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-lg font-bold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 w-full">
        <Button onClick={onRestart} className="flex-1 btn-ku-green font-bold gap-2 min-h-11">
          <RotateCcw className="h-4 w-4" /> Play Again
        </Button>
        <Link href="/arena" className="flex-1"><Button variant="outline" className="w-full min-h-11">Back to Hub</Button></Link>
      </div>
    </div>
  )
}

export function SnakeQuizGame() {
  const { questions, hasQuestions, gameQuestions } = useQuestions()
  const activeQuestions = gameQuestions["snake"] ?? questions
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<State>("pregame")
  const [score, setScore] = useState(0)
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)

  const snakeRef = useRef<Pt[]>([{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }])
  const dirRef = useRef<Dir>("RIGHT")
  const nextDirRef = useRef<Dir>("RIGHT")
  const foodsRef = useRef<Food[]>([])
  const scoreRef = useRef(0)
  const stateRef = useRef<State>("pregame")
  const questionsRef = useRef<QuizQuestion[]>([])
  const qIdxRef = useRef(0)
  const totalAnswRef = useRef(0)
  const livesRef = useRef(MAX_LIVES)
  const tickMsRef = useRef(TICK_MS_BASE)
  const lastTickRef = useRef(0)
  const pauseUntilRef = useRef(0)
  const touchStartRef = useRef<Pt | null>(null)

  useEffect(() => { stateRef.current = gameState }, [gameState])
  const { recordScore } = useScores()
  useEffect(() => { if (gameState === "result") recordScore("snake", score) }, [gameState, score, recordScore])

  const loadNextQuestion = useCallback(() => {
    if (qIdxRef.current >= questionsRef.current.length) {
      questionsRef.current = shuffle([...questionsRef.current]); qIdxRef.current = 0
    }
    const q = questionsRef.current[qIdxRef.current++]
    setCurrentQ(q)
    foodsRef.current = spawnFoods(q, snakeRef.current)
    return q
  }, [])

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }]
    dirRef.current = "RIGHT"; nextDirRef.current = "RIGHT"
    scoreRef.current = 0; livesRef.current = MAX_LIVES; totalAnswRef.current = 0
    tickMsRef.current = TICK_MS_BASE; lastTickRef.current = 0; pauseUntilRef.current = 0
    questionsRef.current = shuffle([...activeQuestions]); qIdxRef.current = 0
    foodsRef.current = []
    setScore(0); setCurrentQ(null); setTotalAnswered(0)
    setGameState("playing")
    setTimeout(() => { if (questionsRef.current.length) loadNextQuestion() }, 300)
  }, [questions, loadNextQuestion])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let running = true
    let rafId = 0

    const tick = (now: number) => {
      if (!running) return
      const st = stateRef.current
      if (st === "playing" && now - lastTickRef.current > tickMsRef.current && now > pauseUntilRef.current) {
        lastTickRef.current = now
        // Advance snake
        dirRef.current = nextDirRef.current
        const head = snakeRef.current[0]
        const dx = dirRef.current === "LEFT" ? -1 : dirRef.current === "RIGHT" ? 1 : 0
        const dy = dirRef.current === "UP" ? -1 : dirRef.current === "DOWN" ? 1 : 0
        const newHead = { x: head.x + dx, y: head.y + dy }

        // Wall collision
        if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
          setGameState("dead"); setTimeout(() => setGameState("result"), 800); return rafId = requestAnimationFrame(tick)
        }
        // Self collision
        if (snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y)) {
          setGameState("dead"); setTimeout(() => setGameState("result"), 800); return rafId = requestAnimationFrame(tick)
        }

        snakeRef.current = [newHead, ...snakeRef.current]
        const curQ = questionsRef.current[qIdxRef.current - 1]

        // Food collision
        const eatenIdx = foodsRef.current.findIndex(f => f.x === newHead.x && f.y === newHead.y)
        if (eatenIdx !== -1) {
          const eaten = foodsRef.current[eatenIdx]
          totalAnswRef.current++; setTotalAnswered(totalAnswRef.current)
          if (eaten.choiceIdx === (curQ?.correct ?? -1)) {
            scoreRef.current++; setScore(scoreRef.current)
            tickMsRef.current = Math.max(80, TICK_MS_BASE - scoreRef.current * 4)
            pauseUntilRef.current = now + 2000  // 2s pause to read new question (tester feedback: need more time)
            if (questionsRef.current.length) loadNextQuestion()
          } else {
            setGameState("dead"); setTimeout(() => setGameState("result"), 800)
          }
        } else {
          snakeRef.current.pop()
        }
      }

      // Draw grid
      ctx.fillStyle = "#0d1f06"; ctx.fillRect(0, 0, CW, CH)
      // Grid lines
      ctx.strokeStyle = "rgba(45,90,20,0.3)"; ctx.lineWidth = 0.5
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, CH); ctx.stroke() }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(CW, y * CELL); ctx.stroke() }

      // Draw foods
      for (const f of foodsRef.current) {
        const fx = f.x * CELL + CELL / 2; const fy = f.y * CELL + CELL / 2
        ctx.fillStyle = FOOD_COLS[f.choiceIdx % 4]
        ctx.beginPath(); ctx.roundRect(f.x * CELL + 3, f.y * CELL + 3, CELL - 6, CELL - 6, 6); ctx.fill()
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.2)"
        ctx.beginPath(); ctx.arc(fx - 4, fy - 4, 4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(LABELS[f.choiceIdx], fx, fy)
      }

      // Draw snake
      for (let i = 0; i < snakeRef.current.length; i++) {
        const s = snakeRef.current[i]
        const isHead = i === 0
        ctx.fillStyle = isHead ? "#336600" : i % 2 === 0 ? "#2d8a18" : "#236b12"
        ctx.beginPath()
        ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, isHead ? 6 : 3)
        ctx.fill()
        if (isHead) {
          // Eyes
          ctx.fillStyle = "#fff"
          const ex = dirRef.current === "RIGHT" ? s.x * CELL + CELL - 8 : dirRef.current === "LEFT" ? s.x * CELL + 5 : s.x * CELL + CELL / 2
          const ey1 = dirRef.current === "DOWN" ? s.y * CELL + CELL - 8 : dirRef.current === "UP" ? s.y * CELL + 5 : s.y * CELL + 7
          const ey2 = dirRef.current === "DOWN" ? s.y * CELL + CELL - 8 : dirRef.current === "UP" ? s.y * CELL + 5 : s.y * CELL + CELL - 7
          ctx.beginPath(); ctx.arc(ex + (dirRef.current === "DOWN" ? -4 : dirRef.current === "UP" ? -4 : 0), ey1, 2.5, 0, Math.PI * 2); ctx.fill()
          ctx.beginPath(); ctx.arc(ex + (dirRef.current === "DOWN" ? 4 : dirRef.current === "UP" ? 4 : 0), ey2, 2.5, 0, Math.PI * 2); ctx.fill()
          // KU dot
          ctx.fillStyle = "#f5c518"
          ctx.beginPath(); ctx.arc(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, 3, 0, Math.PI * 2); ctx.fill()
        }
      }

      // Dead overlay
      if (stateRef.current === "dead") {
        ctx.fillStyle = "rgba(13,31,6,0.65)"; ctx.fillRect(0, 0, CW, CH)
        ctx.fillStyle = "#ef4444"; ctx.font = "bold 26px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("Game Over!", CW / 2, CH / 2)
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(rafId) }
  }, [gameState, loadNextQuestion])

  // Keyboard
  useEffect(() => {
    const DIRS: Record<string, Dir> = {
      ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
      KeyW: "UP", KeyS: "DOWN", KeyA: "LEFT", KeyD: "RIGHT",
    }
    const OPPOSITES: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" }
    const onKey = (e: KeyboardEvent) => {
      const d = DIRS[e.code]
      if (d && d !== OPPOSITES[dirRef.current]) { e.preventDefault(); nextDirRef.current = d }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const OPPOSITES: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" }
    let newDir: Dir
    if (Math.abs(dx) > Math.abs(dy)) { newDir = dx > 0 ? "RIGHT" : "LEFT" }
    else { newDir = dy > 0 ? "DOWN" : "UP" }
    if (newDir !== OPPOSITES[dirRef.current]) nextDirRef.current = newDir
    touchStartRef.current = null
  }, [])

  if (gameState === "pregame") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Snake Quiz</h1>
      </div>
      <PreGame onStart={startGame} hasQuestions={hasQuestions} />
    </div>
  )

  if (gameState === "result") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Snake Quiz</h1>
      </div>
      <PostGame score={score} total={totalAnswered} onRestart={startGame} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Snake Quiz</h1>
      </div>

      {/* Question above grid */}
      {currentQ && (
        <div className="glass-card rounded-xl p-3 border-l-4 border-ku-green-500">
          <p className="text-xs font-bold text-ku-green-500 uppercase tracking-widest mb-1">Question</p>
          <p className="text-sm font-semibold text-foreground">{currentQ.question}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {currentQ.choices.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs text-foreground">
                <span className="flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white"
                  style={{ background: FOOD_COLS[i] }}>{LABELS[i]}</span>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="glass-card rounded-xl p-2 shrink-0 mx-auto lg:mx-0">
          <canvas ref={canvasRef} width={CW} height={CH} className="rounded-lg game-canvas block"
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
            style={{ maxWidth: "100%", height: "auto", touchAction: "none" }} />
        </div>
        <div className="flex flex-col gap-3 flex-1 min-w-0 w-full">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-muted-foreground">Score</p>
              <p className="text-2xl font-black text-ku-gold">{score}</p>
            </div>
            <p className="text-xs text-muted-foreground">+16 XP per correct answer</p>
          </div>
          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Arrow keys / WASD</span> to steer.
              Swipe on mobile. Eat the correct food. Avoid walls and your own tail!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
