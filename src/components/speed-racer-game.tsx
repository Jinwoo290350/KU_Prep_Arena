"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useQuestions } from "@/lib/questions-context"
import type { QuizQuestion } from "@/lib/mock-data"
import { ArrowLeft, RotateCcw, Heart, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GenerateGameButton } from "@/components/generate-game-button"

// ─── Constants ────────────────────────────────────────────────────────────────
const CW = 420
const CH = 620
const LANES = 4
const LABELS = ["A", "B", "C", "D"]
const ROAD_L = 50
const ROAD_R = CW - 50
const ROAD_W = ROAD_R - ROAD_L
const LANE_W = ROAD_W / LANES
const CAR_W = 34
const CAR_H = 56
const BASE_SPEED = 3.2
const SPEED_INC = 0.22
const MAX_LIVES = 3

const SIGN_COLS = ["#3b82f6", "#f97316", "#a855f7", "#ef4444"]

type State = "pregame" | "playing" | "crash" | "gameover" | "result"

interface Billboard { y: number; scored: boolean }

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function getLaneX(lane: number) {
  return ROAD_L + lane * LANE_W + LANE_W / 2
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean) {
  const bx = x - CAR_W / 2
  const by = y - CAR_H / 2
  ctx.fillStyle = "rgba(0,0,0,0.25)"
  ctx.beginPath(); ctx.roundRect(bx + 4, by + 4, CAR_W, CAR_H, 8); ctx.fill()
  ctx.fillStyle = flash ? "#ef4444" : "#336600"
  ctx.beginPath(); ctx.roundRect(bx, by, CAR_W, CAR_H, 8); ctx.fill()
  ctx.fillStyle = flash ? "#dc2626" : "#1e4d0f"
  ctx.beginPath(); ctx.roundRect(bx + 5, by + 12, CAR_W - 10, 22, 5); ctx.fill()
  ctx.fillStyle = "rgba(159,212,106,0.7)"
  ctx.fillRect(bx + 7, by + 8, CAR_W - 14, 10)
  ctx.fillRect(bx + 7, by + 36, CAR_W - 14, 8)
  ctx.fillStyle = "#f5c518"
  ctx.beginPath(); ctx.arc(x, by + 22, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.fillRect(bx + 4, by, 6, 4); ctx.fillRect(bx + CAR_W - 10, by, 6, 4)
  ctx.fillStyle = "#ef4444"
  ctx.fillRect(bx + 4, by + CAR_H - 4, 6, 4); ctx.fillRect(bx + CAR_W - 10, by + CAR_H - 4, 6, 4)
}

function PreGame({ onStart, hasQuestions }: { onStart: () => void; hasQuestions: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
      <div className="text-6xl float-anim">🏎️</div>
      <div>
        <h2 className="text-xl font-black text-foreground">KU Speed Racer</h2>
        <p className="text-sm text-muted-foreground mt-1">Switch into the correct lane before you cross the answer billboard!</p>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">Controls</p>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">← →</kbd> or <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">A D</kbd> — Change lane</p>
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">Tap</kbd> — Move to tapped lane (mobile)</p>
        </div>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">How to play</p>
        <ol className="flex flex-col gap-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>Read the question at the top of the screen</li>
          <li>Lane A, B, C, D are labelled with coloured signs</li>
          <li>Switch into the lane that matches the correct answer</li>
          <li>Pass through the billboard in the correct lane = score</li>
          <li>Wrong lane when crossing = crash = lose a life (3 total)</li>
        </ol>
      </div>
      {!hasQuestions ? (
        <div className="w-full rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">Upload study material to generate questions.</p>
          <Link href="/arena"><Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Go to Hub</Button></Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <GenerateGameButton gameType="racer" label="Speed Racer" />
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
        {[["Answered", total], ["Accuracy", `${pct}%`], ["XP", `+${score * 20}`]].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl bg-secondary/60 p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-lg font-bold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 w-full">
        <Button onClick={onRestart} className="flex-1 btn-ku-green font-bold gap-2 min-h-11">
          <RotateCcw className="h-4 w-4" /> Race Again
        </Button>
        <Link href="/arena" className="flex-1">
          <Button variant="outline" className="w-full min-h-11">Back to Hub</Button>
        </Link>
      </div>
    </div>
  )
}

export function SpeedRacerGame() {
  const { questions, hasQuestions } = useQuestions()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<State>("pregame")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)

  const targetLaneRef = useRef(1)
  const carXRef = useRef(getLaneX(1))
  const billboardRef = useRef<Billboard | null>(null)
  const speedRef = useRef(BASE_SPEED)
  const scoreRef = useRef(0)
  const livesRef = useRef(MAX_LIVES)
  const stateRef = useRef<State>("pregame")
  const questionsRef = useRef<QuizQuestion[]>([])
  const qIdxRef = useRef(0)
  const roadOffRef = useRef(0)
  const crashTimerRef = useRef(0)
  const flashRef = useRef<{ lane: number; correct: boolean; frame: number } | null>(null)
  const totalAnswRef = useRef(0)

  useEffect(() => { stateRef.current = gameState }, [gameState])

  const nextQuestion = useCallback(() => {
    if (qIdxRef.current >= questionsRef.current.length) {
      questionsRef.current = shuffle([...questionsRef.current]); qIdxRef.current = 0
    }
    const q = questionsRef.current[qIdxRef.current++]
    setCurrentQ(q)
    billboardRef.current = { y: -60, scored: false }
    return q
  }, [])

  const startGame = useCallback(() => {
    targetLaneRef.current = 1; carXRef.current = getLaneX(1)
    scoreRef.current = 0; livesRef.current = MAX_LIVES; speedRef.current = BASE_SPEED
    questionsRef.current = shuffle([...questions]); qIdxRef.current = 0
    totalAnswRef.current = 0; billboardRef.current = null; flashRef.current = null; roadOffRef.current = 0
    setScore(0); setLives(MAX_LIVES); setTotalAnswered(0); setCurrentQ(null)
    setGameState("playing")
    setTimeout(() => { if (questionsRef.current.length) nextQuestion() }, 600)
  }, [questions, nextQuestion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let running = true

    const loop = () => {
      if (!running) return
      frameRef.current++
      const st = stateRef.current
      const speed = speedRef.current

      // Grass
      ctx.fillStyle = "#2d8a18"; ctx.fillRect(0, 0, CW, CH)
      if (st === "playing") roadOffRef.current = (roadOffRef.current + speed) % 36
      for (let y = -36; y < CH + 36; y += 36) {
        const sy = y + roadOffRef.current
        ctx.fillStyle = "#236b12"
        ctx.fillRect(0, sy, ROAD_L - 2, 18)
        ctx.fillRect(ROAD_R + 2, sy, CW - ROAD_R - 2, 18)
      }
      // Road
      ctx.fillStyle = "#3a3a3a"; ctx.fillRect(ROAD_L, 0, ROAD_W, CH)
      ctx.fillStyle = "#f5c518"
      ctx.fillRect(ROAD_L, 0, 4, CH); ctx.fillRect(ROAD_R - 4, 0, 4, CH)
      // Lane dashes
      for (let lane = 1; lane < LANES; lane++) {
        const lx = ROAD_L + lane * LANE_W - 1
        for (let y = -36; y < CH + 36; y += 36) {
          ctx.fillStyle = "rgba(255,255,255,0.3)"
          ctx.fillRect(lx, y + roadOffRef.current, 2, 18)
        }
      }

      // Lane labels on road bottom
      for (let i = 0; i < LANES; i++) {
        const lx = getLaneX(i)
        const active = i === targetLaneRef.current
        ctx.fillStyle = active ? "rgba(245,197,24,0.25)" : "rgba(0,0,0,0.1)"
        ctx.fillRect(ROAD_L + i * LANE_W, CH - 36, LANE_W, 36)
        ctx.fillStyle = active ? "#f5c518" : SIGN_COLS[i]
        ctx.font = "bold 16px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(LABELS[i], lx, CH - 18)
      }

      // Car
      const carY = CH - 100
      const targetX = getLaneX(targetLaneRef.current)
      carXRef.current += (targetX - carXRef.current) * 0.18
      const flashCrash = st === "crash" && crashTimerRef.current > 0 && frameRef.current % 6 < 3

      // Billboard
      const bill = billboardRef.current
      const curQ = questionsRef.current[qIdxRef.current - 1]
      if (bill && (st === "playing" || st === "crash")) {
        bill.y += speed * 1.4
        if (!bill.scored) {
          for (let i = 0; i < LANES; i++) {
            const lx = getLaneX(i)
            const bw = LANE_W - 10; const bh = 46
            const bx = lx - bw / 2; const by = bill.y - bh / 2
            const isFL = flashRef.current?.lane === i && flashRef.current.frame > 0
            ctx.fillStyle = isFL
              ? (flashRef.current!.correct ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)")
              : "rgba(13,31,6,0.88)"
            ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill()
            ctx.strokeStyle = isFL
              ? (flashRef.current!.correct ? "#22c55e" : "#ef4444")
              : SIGN_COLS[i]
            ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.stroke()
            ctx.fillStyle = "#e8f5d8"
            ctx.font = "bold 15px Inter, sans-serif"
            ctx.textAlign = "center"; ctx.textBaseline = "middle"
            ctx.fillText(LABELS[i], lx, bill.y - 12)
            ctx.font = "9px Inter, sans-serif"; ctx.fillStyle = "#9fd46a"
            const ch = curQ?.choices[i] ?? ""
            ctx.fillText(ch.length > 15 ? ch.slice(0, 15) + "…" : ch, lx, bill.y + 6)
          }
          ctx.fillStyle = "rgba(245,197,24,0.35)"
          ctx.fillRect(ROAD_L, bill.y - 26, ROAD_W, 3)
        }
        if (flashRef.current && flashRef.current.frame > 0) flashRef.current.frame--
        if (!bill.scored && Math.abs(bill.y - carY) < 32) {
          bill.scored = true
          const correctLane = curQ?.correct ?? 0
          const playerLane = targetLaneRef.current
          totalAnswRef.current++; setTotalAnswered(totalAnswRef.current)
          flashRef.current = { lane: playerLane, correct: playerLane === correctLane, frame: 22 }
          if (playerLane === correctLane) {
            scoreRef.current++; setScore(scoreRef.current)
            speedRef.current = BASE_SPEED + scoreRef.current * SPEED_INC
          } else {
            livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current)
            crashTimerRef.current = 26; setGameState("crash")
            if (livesRef.current <= 0) { setGameState("gameover"); setTimeout(() => setGameState("result"), 1000) }
          }
        }
        if (bill.y > CH + 80 && questionsRef.current.length) nextQuestion()
      }

      if (st === "crash") { crashTimerRef.current--; if (crashTimerRef.current <= 0) setGameState("playing") }

      drawCar(ctx, carXRef.current, carY, flashCrash)

      // Question box
      if (curQ && st !== "pregame") {
        ctx.fillStyle = "rgba(13,31,6,0.9)"; ctx.beginPath(); ctx.roundRect(8, 8, CW - 16, 52, 10); ctx.fill()
        ctx.strokeStyle = "rgba(106,171,53,0.35)"; ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(8, 8, CW - 16, 52, 10); ctx.stroke()
        ctx.fillStyle = "#e8f5d8"; ctx.font = "bold 12px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        const qt = curQ.question
        ctx.fillText(qt.length > 50 ? qt.slice(0, 50) + "…" : qt, CW / 2, 24)
        ctx.font = "10px Inter, sans-serif"; ctx.fillStyle = "#9fd46a"
        ctx.fillText("Get into the correct lane before the billboard!", CW / 2, 44)
      }

      // HUD
      if (st !== "pregame") {
        for (let i = 0; i < MAX_LIVES; i++) {
          ctx.font = "16px sans-serif"; ctx.fillStyle = i < livesRef.current ? "#ef4444" : "rgba(239,68,68,0.2)"
          ctx.textAlign = "left"; ctx.fillText("❤", 12 + i * 22, 66)
        }
        ctx.fillStyle = "#f5c518"; ctx.font = "bold 22px Inter, sans-serif"
        ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(String(scoreRef.current), CW - 12, 66)
      }

      if (st === "gameover") {
        ctx.fillStyle = "rgba(13,31,6,0.78)"; ctx.fillRect(0, 0, CW, CH)
        ctx.fillStyle = "#ef4444"; ctx.font = "bold 30px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("Game Over!", CW / 2, CH / 2)
      }

      requestAnimationFrame(loop)
    }
    loop()
    return () => { running = false }
  }, [gameState, nextQuestion])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stateRef.current !== "playing") return
      if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); targetLaneRef.current = Math.max(0, targetLaneRef.current - 1) }
      if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); targetLaneRef.current = Math.min(LANES - 1, targetLaneRef.current + 1) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (stateRef.current !== "playing") return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = (e.clientX - rect.left) * (CW / rect.width)
    if (cx >= ROAD_L && cx <= ROAD_R) targetLaneRef.current = Math.max(0, Math.min(LANES - 1, Math.floor((cx - ROAD_L) / LANE_W)))
  }, [])

  if (gameState === "pregame") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Speed Racer</h1>
      </div>
      <PreGame onStart={startGame} hasQuestions={hasQuestions} />
    </div>
  )

  if (gameState === "result") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Speed Racer</h1>
      </div>
      <PostGame score={score} total={totalAnswered} onRestart={startGame} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Speed Racer</h1>
      </div>
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="glass-card rounded-xl p-2 shrink-0 mx-auto lg:mx-0">
          <canvas ref={canvasRef} width={CW} height={CH} className="rounded-lg cursor-pointer game-canvas block"
            onClick={handleClick} style={{ maxWidth: "100%", height: "auto" }} />
        </div>
        <div className="flex flex-col gap-4 flex-1 min-w-0 w-full">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground">Score</p>
              <p className="text-2xl font-black text-ku-gold">{score}</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <Heart key={i} className={`h-5 w-5 ${i < lives ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">+20 XP per correct lane</p>
          </div>
          {currentQ && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs font-bold text-ku-green-500 uppercase tracking-widest mb-2">Question</p>
              <p className="text-sm text-foreground leading-relaxed mb-3">{currentQ.question}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {currentQ.choices.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ background: SIGN_COLS[i] }}>{LABELS[i]}</span>
                    <p className="text-xs text-muted-foreground leading-tight truncate">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="glass-card rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">← → / A D</span> to switch lanes.
              Tap a lane on mobile. Be in the correct lane when crossing the billboard!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
