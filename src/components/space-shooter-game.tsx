"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useQuestions } from "@/lib/questions-context"
import { useScores } from "@/lib/use-scores"
import { useStreak } from "@/lib/use-streak"
import type { QuizQuestion } from "@/lib/mock-data"
import { ArrowLeft, RotateCcw, Heart, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GenerateGameButton } from "@/components/generate-game-button"

// ─── Constants ───────────────────────────────────────────────────────────────
const CW = 420
const CH = 580
const SHIP_W = 36
const SHIP_H = 44
const BULLET_W = 4
const BULLET_H = 14
const ASTEROID_R = 36
const ASTEROID_SPEED_BASE = 0.7
const SHIP_SPEED = 5
const BULLET_SPEED = 10
const AUTO_FIRE_RATE = 45 // frames between auto-shots (~0.75s at 60fps)
const READ_FREEZE_FRAMES = 180 // ~3s freeze when new question appears (tester: need more reading time)
const MAX_LIVES = 3

const AST_COLS = ["#3b82f6", "#f97316", "#a855f7", "#ef4444"]
const LABELS = ["A", "B", "C", "D"]

type State = "pregame" | "playing" | "result"

interface Asteroid {
  x: number; y: number; vy: number; vx: number
  choiceIdx: number; radius: number; hit: boolean; explodeFrame: number
}
interface Bullet {
  x: number; y: number
}
interface Star { x: number; y: number; s: number; speed: number }

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, thruster: boolean) {
  const bx = x - SHIP_W / 2
  const by = y - SHIP_H / 2
  // Engine glow
  if (thruster) {
    ctx.fillStyle = "rgba(245,197,24,0.5)"
    ctx.beginPath()
    ctx.ellipse(x, by + SHIP_H + 8, 8, 14 + Math.random() * 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // Body
  ctx.fillStyle = "#236b12"
  ctx.beginPath()
  ctx.moveTo(x, by)
  ctx.lineTo(bx + SHIP_W, by + SHIP_H)
  ctx.lineTo(bx + SHIP_W * 0.6, by + SHIP_H - 8)
  ctx.lineTo(bx + SHIP_W * 0.4, by + SHIP_H - 8)
  ctx.lineTo(bx, by + SHIP_H)
  ctx.closePath(); ctx.fill()
  // Cockpit
  ctx.fillStyle = "#9fd46a"
  ctx.beginPath()
  ctx.ellipse(x, by + SHIP_H * 0.4, 7, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  // Wings
  ctx.fillStyle = "#1e4d0f"
  ctx.beginPath()
  ctx.moveTo(bx, by + SHIP_H * 0.6)
  ctx.lineTo(bx - 14, by + SHIP_H)
  ctx.lineTo(bx + 4, by + SHIP_H * 0.8)
  ctx.closePath(); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(bx + SHIP_W, by + SHIP_H * 0.6)
  ctx.lineTo(bx + SHIP_W + 14, by + SHIP_H)
  ctx.lineTo(bx + SHIP_W - 4, by + SHIP_H * 0.8)
  ctx.closePath(); ctx.fill()
  // KU logo
  ctx.fillStyle = "#f5c518"
  ctx.font = "bold 8px Inter, sans-serif"
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.fillText("KU", x, by + SHIP_H * 0.42)
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid, choice: string) {
  if (a.explodeFrame > 0) {
    const alpha = a.explodeFrame / 15
    const r = ASTEROID_R + (15 - a.explodeFrame) * 3
    ctx.fillStyle = `rgba(245,197,24,${alpha * 0.6})`
    ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`
    ctx.beginPath(); ctx.arc(a.x, a.y, r * 0.5, 0, Math.PI * 2); ctx.fill()
    return
  }
  const col = AST_COLS[a.choiceIdx % 4]
  // Asteroid body (rough polygon)
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = col.replace(")", ", 0.6)").replace("rgb", "rgba")
  ctx.beginPath()
  ctx.arc(a.x + 4, a.y - 4, a.radius * 0.7, 0, Math.PI * 2); ctx.fill()
  // Crater details
  ctx.fillStyle = "rgba(0,0,0,0.25)"
  ctx.beginPath(); ctx.arc(a.x - 6, a.y + 4, 6, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(a.x + 8, a.y - 6, 4, 0, Math.PI * 2); ctx.fill()
  // Label
  ctx.fillStyle = "#fff"
  ctx.font = "bold 16px Inter, sans-serif"
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.fillText(LABELS[a.choiceIdx], a.x, a.y - 8)
  ctx.font = "9px Inter, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.85)"
  const t = choice.length > 10 ? choice.slice(0, 10) + "…" : choice
  ctx.fillText(t, a.x, a.y + 7)
}

// PreGame & PostGame (reusable pattern)
function PreGame({ onStart, hasQuestions }: { onStart: () => void; hasQuestions: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
      <div className="text-6xl float-anim">🚀</div>
      <div>
        <h2 className="text-xl font-black text-foreground">KU Space Shooter</h2>
        <p className="text-sm text-muted-foreground mt-1">Shoot the asteroid labeled with the correct answer. Avoid the wrong ones!</p>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">Controls</p>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">← →</kbd> or <kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">A D</kbd> — Move ship</p>
          <p><span className="font-medium text-foreground">Ship auto-fires</span> every second</p>
          <p><kbd className="bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground">Touch/drag</kbd> — Move ship (mobile)</p>
        </div>
      </div>
      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">How to play</p>
        <ol className="flex flex-col gap-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>Read the question shown at the top</li>
          <li>4 asteroids fall from above — each labeled A / B / C / D</li>
          <li>Position ship under the correct asteroid and let bullets hit it</li>
          <li>Hitting wrong asteroid = lose a life ❤️</li>
          <li>Correct asteroid destroyed = score +1 💥</li>
        </ol>
      </div>
      {!hasQuestions ? (
        <div className="w-full rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">Upload study material to generate questions.</p>
          <Link href="/arena"><Button variant="outline" size="sm" className="gap-2"><Upload className="h-4 w-4" /> Go to Hub</Button></Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <GenerateGameButton gameType="shooter" label="Space Shooter" />
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
        {[["Answered", total], ["Accuracy", `${pct}%`], ["XP", `+${score * 18}`]].map(([l, v]) => (
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

export function SpaceShooterGame() {
  const { questions, hasQuestions, gameQuestions } = useQuestions()
  const activeQuestions = gameQuestions["shooter"] ?? questions
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const [gameState, setGameState] = useState<State>("pregame")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [currentQ, setCurrentQ] = useState<QuizQuestion | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)

  const shipXRef = useRef(CW / 2)
  const bulletsRef = useRef<Bullet[]>([])
  const asteroidsRef = useRef<Asteroid[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(MAX_LIVES)
  const stateRef = useRef<State>("pregame")
  const questionsRef = useRef<QuizQuestion[]>([])
  const qIdxRef = useRef(0)
  const totalAnswRef = useRef(0)
  const starsRef = useRef<Star[]>([])
  const keysRef = useRef({ left: false, right: false })
  const touchXRef = useRef<number | null>(null)
  const astSpeedRef = useRef(ASTEROID_SPEED_BASE)
  const questionSpawnFrameRef = useRef(0)

  useEffect(() => { stateRef.current = gameState }, [gameState])
  const { recordScore } = useScores()
  const { recordStreak } = useStreak()
  useEffect(() => { if (gameState === "result") { recordScore("shooter", score); recordStreak() } }, [gameState, score, recordScore, recordStreak])

  const spawnAsteroids = useCallback((q: QuizQuestion) => {
    const spread = CW / 4
    asteroidsRef.current = [0, 1, 2, 3].map((i) => ({
      x: spread * i + spread / 2,
      y: 140 + Math.random() * 40,   // spawn lower: tester feedback "เอาเป้ายิงลงมา"
      vy: astSpeedRef.current + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.6,
      choiceIdx: i,
      radius: ASTEROID_R,
      hit: false, explodeFrame: 0,
    }))
    questionSpawnFrameRef.current = frameRef.current  // start freeze timer
    setCurrentQ(q)
  }, [])

  const nextQuestion = useCallback(() => {
    if (qIdxRef.current >= questionsRef.current.length) {
      questionsRef.current = shuffle([...questionsRef.current]); qIdxRef.current = 0
    }
    const q = questionsRef.current[qIdxRef.current++]
    spawnAsteroids(q)
    return q
  }, [spawnAsteroids])

  const startGame = useCallback(() => {
    shipXRef.current = CW / 2; bulletsRef.current = []; asteroidsRef.current = []
    scoreRef.current = 0; livesRef.current = MAX_LIVES; totalAnswRef.current = 0; astSpeedRef.current = ASTEROID_SPEED_BASE
    questionsRef.current = shuffle([...activeQuestions]); qIdxRef.current = 0
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * CW, y: Math.random() * CH,
      s: 0.5 + Math.random() * 2, speed: 0.3 + Math.random() * 0.7,
    }))
    setScore(0); setLives(MAX_LIVES); setTotalAnswered(0); setCurrentQ(null)
    setGameState("playing")
    setTimeout(() => { if (questionsRef.current.length) nextQuestion() }, 500)
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

      // Space background
      ctx.fillStyle = "#050f02"; ctx.fillRect(0, 0, CW, CH)
      // Stars
      for (const s of starsRef.current) {
        if (st === "playing") { s.y += s.speed; if (s.y > CH) { s.y = 0; s.x = Math.random() * CW } }
        ctx.fillStyle = `rgba(212,237,186,${0.3 + Math.random() * 0.3})`
        ctx.fillRect(s.x, s.y, s.s, s.s)
      }

      // Distant planet (KU themed, decorative)
      ctx.fillStyle = "rgba(45,138,24,0.08)"
      ctx.beginPath(); ctx.arc(CW - 70, 70, 50, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "rgba(245,197,24,0.06)"
      ctx.beginPath(); ctx.arc(CW - 70, 70, 60, 0, Math.PI * 2); ctx.fill()

      if (st === "playing") {
        // Ship movement
        const tx = touchXRef.current
        if (tx !== null) { shipXRef.current += (tx - shipXRef.current) * 0.15 }
        else {
          if (keysRef.current.left) shipXRef.current = Math.max(SHIP_W, shipXRef.current - SHIP_SPEED)
          if (keysRef.current.right) shipXRef.current = Math.min(CW - SHIP_W, shipXRef.current + SHIP_SPEED)
        }

        // Freeze period — let player read the question before asteroids move
        const frozen = frameRef.current - questionSpawnFrameRef.current < READ_FREEZE_FRAMES

        // Auto fire (not during freeze)
        if (!frozen && frameRef.current % AUTO_FIRE_RATE === 0) {
          bulletsRef.current.push({ x: shipXRef.current, y: CH - 80 })
        }

        // Move bullets
        bulletsRef.current = bulletsRef.current
          .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
          .filter(b => b.y > -20)

        // Move asteroids (not during freeze)
        const curQ = questionsRef.current[qIdxRef.current - 1]
        for (const a of asteroidsRef.current) {
          if (a.hit) { if (a.explodeFrame > 0) a.explodeFrame--; continue }
          if (!frozen) { a.y += a.vy; a.x += a.vx }
          a.x = Math.max(a.radius, Math.min(CW - a.radius, a.x))

          // Bullet collision
          for (const b of bulletsRef.current) {
            const dx = b.x - a.x; const dy = b.y - a.y
            if (Math.sqrt(dx * dx + dy * dy) < a.radius + 4) {
              a.hit = true; a.explodeFrame = 15
              bulletsRef.current = bulletsRef.current.filter(bb => bb !== b)
              totalAnswRef.current++; setTotalAnswered(totalAnswRef.current)
              if (a.choiceIdx === (curQ?.correct ?? -1)) {
                scoreRef.current++; setScore(scoreRef.current)
                astSpeedRef.current = ASTEROID_SPEED_BASE + scoreRef.current * 0.08
                // Correct hit — instantly clear remaining asteroids (no penalty)
                for (const oa of asteroidsRef.current) { if (!oa.hit) { oa.hit = true; oa.explodeFrame = 0 } }
              } else {
                livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current)
                if (livesRef.current <= 0) { setGameState("result"); break }
              }
            }
          }

          // Asteroid hits bottom (miss) — only penalise wrong asteroids
          if (a.y > CH + a.radius && !a.hit) {
            a.hit = true
            if (a.choiceIdx !== (curQ?.correct ?? -1)) {
              livesRef.current = Math.max(0, livesRef.current - 1); setLives(livesRef.current)
              if (livesRef.current <= 0) setGameState("result")
            }
          }
        }

        // All asteroids done → next question (fast 50 ms transition)
        const allDone = asteroidsRef.current.length > 0 && asteroidsRef.current.every(a => a.hit && a.explodeFrame <= 0)
        if (allDone && questionsRef.current.length) {
          setTimeout(() => { if (stateRef.current === "playing") nextQuestion() }, 50)
          asteroidsRef.current = []
        }
      }

      // Draw asteroids
      const curQ = questionsRef.current[qIdxRef.current - 1]
      for (const a of asteroidsRef.current) drawAsteroid(ctx, a, curQ?.choices[a.choiceIdx] ?? "")

      // Draw bullets
      ctx.fillStyle = "#f5c518"
      for (const b of bulletsRef.current) {
        ctx.beginPath(); ctx.roundRect(b.x - BULLET_W / 2, b.y - BULLET_H, BULLET_W, BULLET_H, 2); ctx.fill()
      }

      // Draw ship
      if (st === "playing" || st === "result") {
        drawShip(ctx, shipXRef.current, CH - 60, frameRef.current % 4 < 2)
      }

      // Question box
      if (curQ && st === "playing") {
        ctx.fillStyle = "rgba(5,15,2,0.92)"; ctx.beginPath(); ctx.roundRect(8, 8, CW - 16, 54, 10); ctx.fill()
        ctx.strokeStyle = "rgba(106,171,53,0.4)"; ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(8, 8, CW - 16, 54, 10); ctx.stroke()
        ctx.fillStyle = "#d4edba"; ctx.font = "bold 12px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        const qt = curQ.question
        ctx.fillText(qt.length > 50 ? qt.slice(0, 50) + "…" : qt, CW / 2, 25)
        ctx.font = "10px Inter, sans-serif"; ctx.fillStyle = "#9fd46a"
        ctx.fillText("Shoot the correct asteroid! Avoid wrong ones.", CW / 2, 46)
      }

      // HUD
      if (st === "playing") {
        for (let i = 0; i < MAX_LIVES; i++) {
          ctx.font = "16px sans-serif"; ctx.fillStyle = i < livesRef.current ? "#ef4444" : "rgba(239,68,68,0.2)"
          ctx.textAlign = "left"; ctx.fillText("❤", 12 + i * 22, 66)
        }
        ctx.fillStyle = "#f5c518"; ctx.font = "bold 22px Inter, sans-serif"
        ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(String(scoreRef.current), CW - 12, 66)
      }

      requestAnimationFrame(loop)
    }
    loop()
    return () => { running = false }
  }, [gameState, nextQuestion])

  const handleManualFire = useCallback(() => {
    if (stateRef.current === "playing")
      bulletsRef.current.push({ x: shipXRef.current, y: CH - 80 })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = e.type === "keydown"
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.left = d
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.right = d
      if (e.code === "Space" && d) { e.preventDefault(); handleManualFire() }
    }
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKey)
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey) }
  }, [handleManualFire])

  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const tx = (e.touches[0].clientX - rect.left) * (CW / rect.width)
    touchXRef.current = tx
  }, [])
  const handleTouchEnd = useCallback(() => { touchXRef.current = null }, [])

  if (gameState === "pregame") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Space Shooter</h1>
      </div>
      <PreGame onStart={startGame} hasQuestions={hasQuestions} />
    </div>
  )

  if (gameState === "result") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Space Shooter</h1>
      </div>
      <PostGame score={score} total={totalAnswered} onRestart={startGame} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">KU Space Shooter</h1>
      </div>
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="glass-card rounded-xl p-2 shrink-0 mx-auto lg:mx-0">
          <canvas ref={canvasRef} width={CW} height={CH} className="rounded-lg game-canvas block"
            onTouchMove={handleTouch} onTouchEnd={handleTouchEnd}
            style={{ maxWidth: "100%", height: "auto", touchAction: "none" }} />
          <div className="flex justify-center mt-2 lg:hidden">
            <Button onPointerDown={handleManualFire}
              className="bg-ku-green-500 hover:bg-ku-green-600 text-white font-black text-lg px-10 py-3 rounded-xl">
              FIRE
            </Button>
          </div>
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
          </div>
          {currentQ && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs font-bold text-ku-green-500 uppercase tracking-widest mb-2">Question</p>
              <p className="text-sm text-foreground leading-relaxed mb-3">{currentQ.question}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {currentQ.choices.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{ background: AST_COLS[i] }}>{LABELS[i]}</span>
                    <p className="text-xs text-muted-foreground leading-tight truncate">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="glass-card rounded-xl p-3 space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">← → / A D</span> to move
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Space</span> or <span className="font-semibold text-foreground">FIRE</span> button to shoot manually
            </p>
            <p className="text-xs text-muted-foreground">Ship auto-fires every ~0.75s — shoot the correct asteroid!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
