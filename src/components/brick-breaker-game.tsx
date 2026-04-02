"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useQuestions } from "@/lib/questions-context"
import { useScores } from "@/lib/use-scores"
import type { QuizQuestion } from "@/lib/mock-data"
import { ArrowLeft, RotateCcw, Heart, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GenerateGameButton } from "@/components/generate-game-button"

// ─── Constants ───────────────────────────────────────────────────────────────
const CW = 420
const CH = 560
const PAD_H = 14
const PAD_W = 88
const PAD_Y = CH - 44
const BALL_R = 9
const BALL_SPEED = 3.2

// Answer bricks — fixed row at top, one per lane
const ANS_Y = 100
const ANS_H = 54
const ANS_W = CW / 4

// Bonus brick rows (just for fun — no quiz scoring)
const BONUS_ROWS = 3
const BONUS_COLS = 7
const BONUS_Y = ANS_Y + ANS_H + 12
const BONUS_BRICK_W = (CW - 20) / BONUS_COLS
const BONUS_BRICK_H = 28
const BONUS_PAD = 3

const MAX_LIVES = 3
const KEY_SPEED = 7
const LABELS = ["A", "B", "C", "D"]
const ANSWER_COL = ["#3b82f6", "#f97316", "#a855f7", "#ef4444"]
const BONUS_COLS_ARR = ["#2d8a18", "#236b12", "#1e4d0f", "#2d6e10", "#336600", "#3a7c15", "#266b0e"]

type State = "pregame" | "reading" | "playing" | "result"

interface BonusBrick { x: number; y: number; alive: boolean; color: string }
interface Ball { x: number; y: number; vx: number; vy: number }

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function buildBonusBricks(): BonusBrick[] {
  const bricks: BonusBrick[] = []
  for (let r = 0; r < BONUS_ROWS; r++) {
    for (let c = 0; c < BONUS_COLS; c++) {
      bricks.push({
        x: 10 + c * BONUS_BRICK_W + BONUS_PAD,
        y: BONUS_Y + r * BONUS_BRICK_H + BONUS_PAD,
        alive: true,
        color: BONUS_COLS_ARR[c % BONUS_COLS_ARR.length],
      })
    }
  }
  return bricks
}

/* ─── Pre-game screen ─────────────────────────────────────────────────────── */
function PreGame({ onStart, hasQuestions }: { onStart: () => void; hasQuestions: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
      <div className="text-6xl float-anim">🧱</div>
      <div>
        <h2 className="text-xl font-black text-foreground">KU Brick Breaker</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aim the ball at the correct answer lane (A / B / C / D) at the top!
        </p>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">Controls</p>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">← →</kbd> or <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">A D</kbd> — Move paddle</p>
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">Mouse / Touch</kbd> — Move paddle</p>
        </div>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">How to play</p>
        <ol className="flex flex-col gap-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>Read the question in the sidebar</li>
          <li>4 answer bricks (A / B / C / D) are fixed at the top</li>
          <li>Bounce the ball so it hits the <strong className="text-foreground">correct answer brick</strong></li>
          <li>The paddle shows which lane you are aiming at</li>
          <li>Wrong brick = lose a life ❤️ — Correct = next question!</li>
        </ol>
      </div>
      {!hasQuestions ? (
        <div className="w-full rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">Upload study material to generate questions.</p>
          <Link href="/arena">
            <Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Go to Hub</Button>
          </Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <GenerateGameButton gameType="bricks" label="Brick Breaker" />
          <Button onClick={onStart} className="w-full btn-ku-green text-base font-bold py-3 min-h-12 pulse-green">
            START GAME
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── Post-game screen ────────────────────────────────────────────────────── */
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
        {[["Answered", total], ["Accuracy", `${pct}%`], ["XP", `+${score * 14}`]].map(([l, v]) => (
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
        <Link href="/arena" className="flex-1">
          <Button variant="outline" className="w-full min-h-11">Back to Hub</Button>
        </Link>
      </div>
    </div>
  )
}

/* ─── Main Game Component ─────────────────────────────────────────────────── */
export function BrickBreakerGame() {
  const { questions, hasQuestions, gameQuestions } = useQuestions()
  const activeQuestions = gameQuestions["bricks"] ?? questions
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<State>("pregame")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)

  const padXRef = useRef(CW / 2)
  const ballRef = useRef<Ball>({ x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 0, vy: 0 })
  const bonusBricksRef = useRef<BonusBrick[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(MAX_LIVES)
  const stateRef = useRef<State>("pregame")
  const questionsRef = useRef<QuizQuestion[]>([])
  const qIdxRef = useRef(0)
  const totalAnswRef = useRef(0)
  const flashRef = useRef<{ correct: boolean; frame: number } | null>(null)
  const mouseXRef = useRef(CW / 2)
  const keysRef = useRef({ left: false, right: false })
  const readingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Which answer lane the paddle is currently over (for visual hint)
  const aimLaneRef = useRef(0)

  useEffect(() => { stateRef.current = gameState }, [gameState])
  const { recordScore } = useScores()
  useEffect(() => { if (gameState === "result") recordScore("bricks", score) }, [gameState, score, recordScore])

  const resetBall = useCallback(() => {
    ballRef.current = {
      x: padXRef.current,
      y: PAD_Y - BALL_R - 2,
      vx: (Math.random() - 0.5) * 2,
      vy: -BALL_SPEED,
    }
  }, [])

  const loadNextQuestion = useCallback(() => {
    if (qIdxRef.current >= questionsRef.current.length) {
      questionsRef.current = shuffle([...questionsRef.current])
      qIdxRef.current = 0
    }
    const q = questionsRef.current[qIdxRef.current++]
    setCurrentQ(q)
    bonusBricksRef.current = buildBonusBricks()
    resetBall()
  }, [resetBall])

  const startGame = useCallback(() => {
    padXRef.current = CW / 2
    mouseXRef.current = CW / 2
    scoreRef.current = 0
    livesRef.current = MAX_LIVES
    totalAnswRef.current = 0
    questionsRef.current = shuffle([...activeQuestions])
    qIdxRef.current = 0
    bonusBricksRef.current = []
    flashRef.current = null
    setScore(0); setLives(MAX_LIVES); setCurrentQ(null); setTotalAnswered(0)
    setGameState("reading")
    // Short reading pause before ball launches
    readingTimerRef.current = setTimeout(() => {
      if (questionsRef.current.length) loadNextQuestion()
      setGameState("playing")
    }, 800)
  }, [questions, loadNextQuestion])

  // Cleanup timer on unmount
  useEffect(() => () => { if (readingTimerRef.current) clearTimeout(readingTimerRef.current) }, [])

  // ─── Main game loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let running = true

    const loop = () => {
      if (!running) return
      const st = stateRef.current

      // Background
      ctx.fillStyle = "#0d1f06"
      ctx.fillRect(0, 0, CW, CH)

      // Subtle grid
      ctx.strokeStyle = "rgba(45,90,20,0.15)"; ctx.lineWidth = 0.5
      for (let x = 0; x < CW; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke() }
      for (let y = 0; y < CH; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke() }

      // Flash tint
      if (flashRef.current && flashRef.current.frame > 0) {
        flashRef.current.frame--
        const a = (flashRef.current.frame / 14) * 0.35
        ctx.fillStyle = flashRef.current.correct ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`
        ctx.fillRect(0, 0, CW, CH)
      }

      // ── Draw answer bricks (fixed lanes at top) ─────────────────────────
      const curQ = questionsRef.current[qIdxRef.current - 1]
      for (let i = 0; i < 4; i++) {
        const bx = i * ANS_W; const by = ANS_Y
        const isAimLane = aimLaneRef.current === i
        // Glow on aimed lane
        if (isAimLane) {
          ctx.fillStyle = ANSWER_COL[i] + "44"
          ctx.fillRect(bx, 0, ANS_W, CH)
        }
        ctx.fillStyle = ANSWER_COL[i]
        ctx.beginPath(); ctx.roundRect(bx + 3, by, ANS_W - 6, ANS_H, 6); ctx.fill()
        // Top highlight
        ctx.fillStyle = "rgba(255,255,255,0.2)"
        ctx.beginPath(); ctx.roundRect(bx + 3, by, ANS_W - 6, 5, [6, 6, 0, 0]); ctx.fill()
        // Label
        ctx.fillStyle = "#fff"; ctx.font = "bold 18px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(LABELS[i], bx + ANS_W / 2, by + ANS_H / 2)
        // Correct answer pulsing border
        if (curQ && i === curQ.correct) {
          const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 200)
          ctx.strokeStyle = `rgba(245,197,24,${pulse})`; ctx.lineWidth = 3
          ctx.beginPath(); ctx.roundRect(bx + 3, by, ANS_W - 6, ANS_H, 6); ctx.stroke()
        }
        // Lane dividers
        if (i < 3) {
          ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo((i + 1) * ANS_W, ANS_Y - 4); ctx.lineTo((i + 1) * ANS_W, ANS_Y + ANS_H + 4); ctx.stroke()
        }
      }

      if (st === "playing") {
        // Paddle movement
        if (keysRef.current.left) mouseXRef.current = Math.max(PAD_W / 2, mouseXRef.current - KEY_SPEED)
        if (keysRef.current.right) mouseXRef.current = Math.min(CW - PAD_W / 2, mouseXRef.current + KEY_SPEED)
        padXRef.current += (mouseXRef.current - padXRef.current) * 0.22
        padXRef.current = Math.max(PAD_W / 2, Math.min(CW - PAD_W / 2, padXRef.current))

        // Update aimed lane based on paddle center position
        aimLaneRef.current = Math.min(3, Math.floor(padXRef.current / (CW / 4)))

        // Ball physics
        const ball = ballRef.current
        ball.x += ball.vx; ball.y += ball.vy

        // Wall bounces
        if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) }
        if (ball.x > CW - BALL_R) { ball.x = CW - BALL_R; ball.vx = -Math.abs(ball.vx) }
        if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) }

        // Paddle collision
        const px = padXRef.current
        if (
          ball.y + BALL_R > PAD_Y - PAD_H / 2 &&
          ball.y - BALL_R < PAD_Y + PAD_H / 2 &&
          ball.x > px - PAD_W / 2 - BALL_R &&
          ball.x < px + PAD_W / 2 + BALL_R &&
          ball.vy > 0
        ) {
          ball.vy = -Math.abs(ball.vy)
          // Angle based on hit position: center = straight, edge = steep angle
          const hitPos = (ball.x - px) / (PAD_W / 2)
          ball.vx = hitPos * BALL_SPEED * 1.2
          // Clamp speed
          const spd = Math.sqrt(ball.vx ** 2 + ball.vy ** 2)
          if (spd > BALL_SPEED * 1.5) { ball.vx = (ball.vx / spd) * BALL_SPEED * 1.5; ball.vy = (ball.vy / spd) * BALL_SPEED * 1.5 }
        }

        // Ball falls below paddle → lose a life, reset
        if (ball.y > CH + BALL_R) {
          livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current)
          if (livesRef.current <= 0) { setGameState("result"); requestAnimationFrame(loop); return }
          resetBall()
        }

        // Answer brick collisions
        for (let i = 0; i < 4; i++) {
          const bx = i * ANS_W + 3; const by = ANS_Y
          const bw = ANS_W - 6; const bh = ANS_H
          if (
            ball.x + BALL_R > bx && ball.x - BALL_R < bx + bw &&
            ball.y + BALL_R > by && ball.y - BALL_R < by + bh
          ) {
            // Bounce off
            const overlapX = Math.min(ball.x + BALL_R - bx, bx + bw - (ball.x - BALL_R))
            const overlapY = Math.min(ball.y + BALL_R - by, by + bh - (ball.y - BALL_R))
            if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = Math.abs(ball.vy)

            totalAnswRef.current++; setTotalAnswered(totalAnswRef.current)
            if (i === (curQ?.correct ?? -1)) {
              scoreRef.current++; setScore(scoreRef.current)
              flashRef.current = { correct: true, frame: 14 }
              setTimeout(() => { if (stateRef.current === "playing") loadNextQuestion() }, 400)
            } else {
              livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current)
              flashRef.current = { correct: false, frame: 14 }
              if (livesRef.current <= 0) { setGameState("result"); requestAnimationFrame(loop); return }
            }
            break
          }
        }

        // Bonus brick collisions
        for (const b of bonusBricksRef.current) {
          if (!b.alive) continue
          if (
            ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + BONUS_BRICK_W - BONUS_PAD * 2 &&
            ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + BONUS_BRICK_H - BONUS_PAD * 2
          ) {
            const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + BONUS_BRICK_W - BONUS_PAD * 2 - (ball.x - BALL_R))
            const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + BONUS_BRICK_H - BONUS_PAD * 2 - (ball.y - BALL_R))
            if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy
            b.alive = false
            break
          }
        }

        // Respawn bonus bricks when all cleared
        if (bonusBricksRef.current.every(b => !b.alive)) {
          bonusBricksRef.current = buildBonusBricks()
        }
      }

      // Draw bonus bricks
      for (const b of bonusBricksRef.current) {
        if (!b.alive) continue
        ctx.fillStyle = b.color
        ctx.beginPath(); ctx.roundRect(b.x, b.y, BONUS_BRICK_W - BONUS_PAD * 2, BONUS_BRICK_H - BONUS_PAD * 2, 4); ctx.fill()
        ctx.fillStyle = "rgba(255,255,255,0.15)"
        ctx.beginPath(); ctx.roundRect(b.x, b.y, BONUS_BRICK_W - BONUS_PAD * 2, 4, [4, 4, 0, 0]); ctx.fill()
      }

      // Draw ball
      const ball = ballRef.current
      ctx.fillStyle = "#f5c518"
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "rgba(255,255,255,0.45)"
      ctx.beginPath(); ctx.arc(ball.x - 3, ball.y - 3, BALL_R * 0.38, 0, Math.PI * 2); ctx.fill()

      // Draw paddle with A/B/C/D lane zones
      const px = padXRef.current
      ctx.fillStyle = "#236b12"
      ctx.beginPath(); ctx.roundRect(px - PAD_W / 2, PAD_Y - PAD_H / 2, PAD_W, PAD_H, PAD_H / 2); ctx.fill()
      // Aimed lane highlight on paddle
      const al = aimLaneRef.current
      const laneW = PAD_W / 4
      ctx.fillStyle = ANSWER_COL[al] + "bb"
      const hlX = px - PAD_W / 2 + al * laneW
      ctx.beginPath(); ctx.roundRect(hlX, PAD_Y - PAD_H / 2, laneW, PAD_H, PAD_H / 2); ctx.fill()
      // Paddle lane letters
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i === al ? "#fff" : "rgba(255,255,255,0.4)"
        ctx.font = `bold ${i === al ? 9 : 8}px Inter, sans-serif`
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(LABELS[i], px - PAD_W / 2 + i * laneW + laneW / 2, PAD_Y)
      }

      // HUD: lives + score
      if (st !== "pregame") {
        for (let i = 0; i < MAX_LIVES; i++) {
          ctx.font = "16px sans-serif"; ctx.fillStyle = i < livesRef.current ? "#ef4444" : "rgba(239,68,68,0.2)"
          ctx.textAlign = "left"; ctx.textBaseline = "bottom"
          ctx.fillText("❤", 10 + i * 22, CH - 8)
        }
        ctx.fillStyle = "#f5c518"; ctx.font = "bold 20px Inter, sans-serif"
        ctx.textAlign = "right"; ctx.textBaseline = "bottom"
        ctx.fillText(String(scoreRef.current), CW - 10, CH - 8)
      }

      requestAnimationFrame(loop)
    }

    loop()
    return () => { running = false }
  }, [gameState, loadNextQuestion, resetBall])

  // Mouse
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseXRef.current = (e.clientX - rect.left) * (CW / rect.width)
    }
    canvas.addEventListener("mousemove", onMove)
    return () => canvas.removeEventListener("mousemove", onMove)
  }, [])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const left = e.code === "ArrowLeft" || e.code === "KeyA"
      const right = e.code === "ArrowRight" || e.code === "KeyD"
      if (left || right) e.preventDefault()
      if (e.type === "keydown") {
        if (left) keysRef.current.left = true
        if (right) keysRef.current.right = true
      } else {
        if (left) keysRef.current.left = false
        if (right) keysRef.current.right = false
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", onKey)
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey) }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseXRef.current = (e.touches[0].clientX - rect.left) * (CW / rect.width)
  }, [])

  if (gameState === "pregame") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Brick Breaker</h1>
      </div>
      <PreGame onStart={startGame} hasQuestions={hasQuestions} />
    </div>
  )

  if (gameState === "result") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Brick Breaker</h1>
      </div>
      <PostGame score={score} total={totalAnswered} onRestart={startGame} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Brick Breaker</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="flex flex-col gap-3 shrink-0 mx-auto lg:mx-0">
          <div className="glass-card rounded-xl p-2">
            <canvas
              ref={canvasRef} width={CW} height={CH}
              className="rounded-lg game-canvas block"
              onTouchMove={handleTouchMove}
              style={{ maxWidth: "100%", height: "auto", touchAction: "none", cursor: "none" }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1 min-w-0 w-full">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">Score</p>
              <p className="text-2xl font-black text-ku-gold">{score}</p>
            </div>
            <div className="flex items-center gap-2">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <Heart key={i} className={`h-5 w-5 ${i < lives ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
              ))}
            </div>
          </div>

          {currentQ && (
            <div className="glass-card rounded-xl p-4 border-l-4 border-ku-green-500">
              <p className="text-xs font-bold text-ku-green-500 uppercase tracking-widest mb-2">Question</p>
              <p className="text-sm font-semibold text-foreground mb-3">{currentQ.question}</p>
              <div className="flex flex-col gap-1.5">
                {currentQ.choices.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ background: ANSWER_COL[i] }}
                    >{LABELS[i]}</span>
                    <p className="text-xs text-muted-foreground">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Move the paddle left/right to aim at the correct lane. The <span className="font-semibold text-foreground">glowing brick</span> on the paddle shows your current aim (A / B / C / D). Bounce the ball up to hit the right answer!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
