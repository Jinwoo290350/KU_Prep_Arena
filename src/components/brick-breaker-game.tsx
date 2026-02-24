"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useQuestions } from "@/lib/questions-context"
import type { QuizQuestion } from "@/lib/mock-data"
import { ArrowLeft, RotateCcw, Heart, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GenerateGameButton } from "@/components/generate-game-button"

// ─── Constants ───────────────────────────────────────────────────────────────
const CW = 480
const CH = 560
const PAD_H = 14
const PAD_W = 90
const PAD_Y = CH - 40
const BALL_R = 9
const BALL_SPEED_BASE = 4.5
const BRICK_ROWS = 4
const BRICK_COLS = 8
const BRICK_W = (CW - 20) / BRICK_COLS
const BRICK_H = 32
const BRICK_PAD = 3
const MAX_LIVES = 3
const KEY_SPEED = 7          // paddle pixels per frame when using arrow keys
const LABELS = ["A", "B", "C", "D"]
const ANSWER_COL = ["#3b82f6", "#f97316", "#a855f7", "#ef4444"]
const DECOY_COLS = ["#4a8c1c", "#236b12", "#2d8a18", "#336600", "#1e4d0f", "#6aab35"]

type State = "pregame" | "playing" | "result"

interface Brick {
  x: number; y: number; w: number; h: number
  isAnswer: boolean; choiceIdx: number  // only if isAnswer
  alive: boolean; color: string; label: string
}
interface Ball { x: number; y: number; vx: number; vy: number }

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

function buildBricks(q: QuizQuestion): Brick[] {
  const bricks: Brick[] = []
  // Positions for answer bricks — place them in 4 random slots
  const allSlots: { row: number; col: number }[] = []
  for (let r = 0; r < BRICK_ROWS; r++) for (let c = 0; c < BRICK_COLS; c++) allSlots.push({ row: r, col: c })
  const answerSlots = shuffle(allSlots).slice(0, 4)

  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const x = 10 + c * BRICK_W + BRICK_PAD
      const y = 60 + r * BRICK_H + BRICK_PAD
      const w = BRICK_W - BRICK_PAD * 2
      const h = BRICK_H - BRICK_PAD * 2
      const slotIdx = answerSlots.findIndex(s => s.row === r && s.col === c)
      if (slotIdx !== -1) {
        bricks.push({ x, y, w, h, isAnswer: true, choiceIdx: slotIdx, alive: true, color: ANSWER_COL[slotIdx], label: LABELS[slotIdx] })
      } else {
        const dc = DECOY_COLS[Math.floor(Math.random() * DECOY_COLS.length)]
        bricks.push({ x, y, w, h, isAnswer: false, choiceIdx: -1, alive: true, color: dc, label: "" })
      }
    }
  }
  return bricks
}

function PreGame({ onStart, hasQuestions }: { onStart: () => void; hasQuestions: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
      <div className="text-6xl float-anim">🧱</div>
      <div>
        <h2 className="text-xl font-black text-foreground">KU Brick Breaker</h2>
        <p className="text-sm text-muted-foreground mt-1">Break ONLY the brick labeled with the correct answer. Wrong brick = lose a life!</p>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">Controls</p>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">← →</kbd> or <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">A D</kbd> — Move paddle (keyboard)</p>
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">Mouse</kbd> — Move paddle (desktop)</p>
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">Touch</kbd> — Move paddle (mobile)</p>
        </div>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">How to play</p>
        <ol className="flex flex-col gap-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>Read the question shown below the brick grid</li>
          <li>Answer bricks A, B, C, D are hidden among decoy bricks</li>
          <li>Bounce the ball to break the correct answer brick</li>
          <li>Wrong answer brick hit = lose a life ❤️ (ball bounces away)</li>
          <li>Correct break = score +1 + new question!</li>
        </ol>
      </div>
      {!hasQuestions ? (
        <div className="w-full rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">Upload study material to generate questions.</p>
          <Link href="/arena"><Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Go to Hub</Button></Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <GenerateGameButton gameType="bricks" label="Brick Breaker" />
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
        <Link href="/arena" className="flex-1"><Button variant="outline" className="w-full min-h-11">Back to Hub</Button></Link>
      </div>
    </div>
  )
}

export function BrickBreakerGame() {
  const { questions, hasQuestions } = useQuestions()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameState, setGameState] = useState<State>("pregame")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)

  const padXRef = useRef(CW / 2)
  const ballRef = useRef<Ball>({ x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 2.5, vy: -BALL_SPEED_BASE })
  const bricksRef = useRef<Brick[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(MAX_LIVES)
  const stateRef = useRef<State>("pregame")
  const questionsRef = useRef<QuizQuestion[]>([])
  const qIdxRef = useRef(0)
  const totalAnswRef = useRef(0)
  const flashRef = useRef<{ correct: boolean; frame: number } | null>(null)
  const ballLaunchedRef = useRef(false)
  const mouseXRef = useRef(CW / 2)
  const keysRef = useRef({ left: false, right: false })

  useEffect(() => { stateRef.current = gameState }, [gameState])

  const loadNextQuestion = useCallback(() => {
    if (qIdxRef.current >= questionsRef.current.length) {
      questionsRef.current = shuffle([...questionsRef.current]); qIdxRef.current = 0
    }
    const q = questionsRef.current[qIdxRef.current++]
    setCurrentQ(q)
    bricksRef.current = buildBricks(q)
    // Reset ball
    ballRef.current = { x: CW / 2, y: PAD_Y - BALL_R - 2, vx: (Math.random() - 0.5) * 4, vy: -BALL_SPEED_BASE }
    ballLaunchedRef.current = true
    return q
  }, [])

  const startGame = useCallback(() => {
    padXRef.current = CW / 2; mouseXRef.current = CW / 2
    scoreRef.current = 0; livesRef.current = MAX_LIVES; totalAnswRef.current = 0
    questionsRef.current = shuffle([...questions]); qIdxRef.current = 0
    ballRef.current = { x: CW / 2, y: PAD_Y - BALL_R - 2, vx: 2, vy: -BALL_SPEED_BASE }
    ballLaunchedRef.current = false; bricksRef.current = []
    flashRef.current = null
    setScore(0); setLives(MAX_LIVES); setCurrentQ(null); setTotalAnswered(0)
    setGameState("playing")
    setTimeout(() => { if (questionsRef.current.length) loadNextQuestion() }, 500)
  }, [questions, loadNextQuestion])

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
      ctx.fillStyle = "#0d1f06"; ctx.fillRect(0, 0, CW, CH)
      // Subtle grid
      ctx.strokeStyle = "rgba(45,90,20,0.15)"; ctx.lineWidth = 0.5
      for (let x = 0; x < CW; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke() }
      for (let y = 0; y < CH; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke() }

      // Flash tint
      if (flashRef.current && flashRef.current.frame > 0) {
        flashRef.current.frame--
        const a = (flashRef.current.frame / 12) * 0.3
        ctx.fillStyle = flashRef.current.correct ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`
        ctx.fillRect(0, 0, CW, CH)
      }

      if (st === "playing") {
        // Keyboard paddle movement (arrow keys / A D)
        if (keysRef.current.left) mouseXRef.current = Math.max(PAD_W / 2, mouseXRef.current - KEY_SPEED)
        if (keysRef.current.right) mouseXRef.current = Math.min(CW - PAD_W / 2, mouseXRef.current + KEY_SPEED)
        // Move paddle toward mouse/touch
        padXRef.current += (mouseXRef.current - padXRef.current) * 0.22
        padXRef.current = Math.max(PAD_W / 2, Math.min(CW - PAD_W / 2, padXRef.current))

        // Move ball
        if (ballLaunchedRef.current) {
          const ball = ballRef.current
          ball.x += ball.vx; ball.y += ball.vy

          // Wall bounces
          if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) }
          if (ball.x > CW - BALL_R) { ball.x = CW - BALL_R; ball.vx = -Math.abs(ball.vx) }
          if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) }

          // Paddle collision
          const px = padXRef.current; const py = PAD_Y
          if (ball.y + BALL_R > py - PAD_H / 2 && ball.y - BALL_R < py + PAD_H / 2 &&
            ball.x > px - PAD_W / 2 - BALL_R && ball.x < px + PAD_W / 2 + BALL_R && ball.vy > 0) {
            ball.vy = -Math.abs(ball.vy)
            const hitPos = (ball.x - px) / (PAD_W / 2)
            ball.vx = hitPos * BALL_SPEED_BASE * 1.1
          }

          // Ball falls below paddle
          if (ball.y > CH + BALL_R) {
            livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current)
            if (livesRef.current <= 0) { setGameState("result"); return requestAnimationFrame(loop) }
            ball.x = padXRef.current; ball.y = PAD_Y - BALL_R - 2
            ball.vx = (Math.random() - 0.5) * 3; ball.vy = -BALL_SPEED_BASE
          }

          // Brick collisions
          const curQ = questionsRef.current[qIdxRef.current - 1]
          for (const b of bricksRef.current) {
            if (!b.alive) continue
            if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
              ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
              // Determine bounce axis
              const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + b.w - (ball.x - BALL_R))
              const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + b.h - (ball.y - BALL_R))
              if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy

              if (b.isAnswer && b.choiceIdx === (curQ?.correct ?? -1)) {
                // Correct!
                b.alive = false
                scoreRef.current++; setScore(scoreRef.current)
                totalAnswRef.current++; setTotalAnswered(totalAnswRef.current)
                flashRef.current = { correct: true, frame: 12 }
                setTimeout(() => { if (stateRef.current === "playing") loadNextQuestion() }, 300)
              } else if (b.isAnswer) {
                // Wrong answer brick — bounce but don't break
                totalAnswRef.current++; setTotalAnswered(totalAnswRef.current)
                flashRef.current = { correct: false, frame: 12 }
                livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current)
                if (livesRef.current <= 0) { setGameState("result"); return requestAnimationFrame(loop) }
              } else {
                // Decoy — break silently
                b.alive = false
              }
              break
            }
          }
        }
      }

      // Draw bricks
      for (const b of bricksRef.current) {
        if (!b.alive) continue
        ctx.fillStyle = b.color
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 5); ctx.fill()
        // Highlight top edge
        ctx.fillStyle = "rgba(255,255,255,0.2)"
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, 4, [5, 5, 0, 0]); ctx.fill()
        if (b.isAnswer) {
          ctx.fillStyle = "#fff"; ctx.font = "bold 12px Inter, sans-serif"
          ctx.textAlign = "center"; ctx.textBaseline = "middle"
          ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2)
        }
      }

      // Draw ball
      const ball = ballRef.current
      ctx.fillStyle = "#f5c518"
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "rgba(255,255,255,0.4)"
      ctx.beginPath(); ctx.arc(ball.x - 3, ball.y - 3, BALL_R * 0.4, 0, Math.PI * 2); ctx.fill()

      // Draw paddle
      const px = padXRef.current
      ctx.fillStyle = "#336600"
      ctx.beginPath(); ctx.roundRect(px - PAD_W / 2, PAD_Y - PAD_H / 2, PAD_W, PAD_H, PAD_H / 2); ctx.fill()
      ctx.fillStyle = "#9fd46a"
      ctx.beginPath(); ctx.roundRect(px - PAD_W / 2, PAD_Y - PAD_H / 2, PAD_W, 4, [PAD_H / 2, PAD_H / 2, 0, 0]); ctx.fill()
      // KU on paddle
      ctx.fillStyle = "#f5c518"; ctx.font = "bold 9px Inter, sans-serif"
      ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText("KU", px, PAD_Y)

      // Lives
      if (st !== "pregame") {
        for (let i = 0; i < MAX_LIVES; i++) {
          ctx.font = "16px sans-serif"; ctx.fillStyle = i < livesRef.current ? "#ef4444" : "rgba(239,68,68,0.2)"
          ctx.textAlign = "left"; ctx.fillText("❤", 10 + i * 22, CH - 20)
        }
        ctx.fillStyle = "#f5c518"; ctx.font = "bold 20px Inter, sans-serif"
        ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(String(scoreRef.current), CW - 10, CH - 8)
      }

      requestAnimationFrame(loop)
    }
    loop()
    return () => { running = false }
  }, [gameState, loadNextQuestion])

  // Mouse
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseXRef.current = (e.clientX - rect.left) * (CW / rect.width)
    }
    canvas.addEventListener("mousemove", onMove)
    return () => canvas.removeEventListener("mousemove", onMove)
  }, [])

  // Keyboard (arrow keys / A D)
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
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", onKey)
    }
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
            <canvas ref={canvasRef} width={CW} height={CH} className="rounded-lg game-canvas block"
              onTouchMove={handleTouchMove}
              style={{ maxWidth: "100%", height: "auto", touchAction: "none", cursor: "none" }} />
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
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ background: ANSWER_COL[i] }}>{LABELS[i]}</span>
                    <p className="text-xs text-muted-foreground">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              Move mouse or drag to control the paddle. Break the <span className="font-semibold text-foreground">labelled answer brick</span> (A/B/C/D) with the ball. Wrong brick = lose a life!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
