"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useQuestions } from "@/lib/questions-context"
import { useScores } from "@/lib/use-scores"
import type { QuizQuestion } from "@/lib/mock-data"
import { ArrowLeft, RotateCcw, Heart, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GenerateGameButton } from "@/components/generate-game-button"

// ─── Constants ────────────────────────────────────────────────────────────────
const CW = 480
const CH = 560
const BIRD_R = 18
const GRAVITY = 0.22    // reduced: bird falls slower (tester feedback)
const FLAP = -6.8
const PIPE_W = 70
const PIPE_GAP = 280    // wider gap: more space to read & aim (tester feedback)
const PIPE_SPEED_BASE = 1.4
const SPEED_BUMP = 5
const MAX_LIVES = 3

type State = "pregame" | "countdown" | "playing" | "dead" | "result"

// ─── True/False question derived from MCQ ─────────────────────────────────────
interface TFQuestion {
  question: string      // original question text
  shownAnswer: string   // the choice text being judged
  answer: boolean       // true = shownAnswer IS correct → bird should fly TOP
  explanation: string
}

interface Pipe {
  x: number
  gapTop: number
  question: TFQuestion | null
  answered: boolean
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function mkTFQ(q: QuizQuestion): TFQuestion {
  const correctText = q.choices[q.correct]
  const wrongChoices = q.choices.filter((_, i) => i !== q.correct)
  const wrongText = wrongChoices[Math.floor(Math.random() * wrongChoices.length)]
  const isTrue = Math.random() > 0.5
  return {
    question: q.question,
    shownAnswer: isTrue ? correctText : wrongText,
    answer: isTrue,
    explanation: q.explanation,
  }
}

// ─── Draw owl ─────────────────────────────────────────────────────────────────
function drawOwl(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, flapping: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)

  const wingDy = flapping ? -8 : 4
  ctx.fillStyle = "#4a8c1c"
  ctx.beginPath()
  ctx.ellipse(-6, wingDy, 14, 8, -0.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#336600"
  ctx.beginPath()
  ctx.ellipse(0, 0, BIRD_R, BIRD_R - 2, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#9fd46a"
  ctx.beginPath()
  ctx.ellipse(2, 4, 10, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#fff"
  ctx.beginPath(); ctx.arc(-7, -5, 7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#1a3a0a"
  ctx.beginPath(); ctx.arc(-5, -5, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.beginPath(); ctx.arc(-4, -6, 1.5, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = "#fff"
  ctx.beginPath(); ctx.arc(7, -5, 7, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#1a3a0a"
  ctx.beginPath(); ctx.arc(9, -5, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.beginPath(); ctx.arc(10, -6, 1.5, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = "#f5c518"
  ctx.beginPath()
  ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineTo(0, 6); ctx.closePath()
  ctx.fill()

  ctx.fillStyle = "#9fd46a"
  ctx.beginPath()
  ctx.ellipse(0, -BIRD_R + 4, 5, 9, 0.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ─── Draw pipe with TRUE / FALSE zones ────────────────────────────────────────
function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe) {
  const top = pipe.gapTop
  const bot = top + PIPE_GAP
  const mid = top + PIPE_GAP / 2
  const lip = 14

  // Top pipe
  ctx.fillStyle = "#236b12"
  ctx.fillRect(pipe.x, 0, PIPE_W, top - lip)
  ctx.fillStyle = "#1a3a0a"
  ctx.fillRect(pipe.x + 4, 0, 10, top - lip)
  ctx.fillStyle = "#336600"
  ctx.fillRect(pipe.x - 5, top - lip, PIPE_W + 10, lip)
  ctx.fillStyle = "#6aab35"
  ctx.fillRect(pipe.x - 5, top - lip, PIPE_W + 10, 3)

  // Bottom pipe
  ctx.fillStyle = "#236b12"
  ctx.fillRect(pipe.x, bot + lip, PIPE_W, CH - bot - lip)
  ctx.fillStyle = "#1a3a0a"
  ctx.fillRect(pipe.x + 4, bot + lip, 10, CH - bot - lip)
  ctx.fillStyle = "#336600"
  ctx.fillRect(pipe.x - 5, bot, PIPE_W + 10, lip)
  ctx.fillStyle = "#6aab35"
  ctx.fillRect(pipe.x - 5, bot + lip - 3, PIPE_W + 10, 3)

  // TRUE zone (top half of gap) — green
  ctx.fillStyle = "rgba(34,197,94,0.22)"
  ctx.fillRect(pipe.x, top, PIPE_W, PIPE_GAP / 2)
  ctx.fillStyle = "#22c55e"
  ctx.font = "bold 12px Inter, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("TRUE", pipe.x + PIPE_W / 2, top + PIPE_GAP * 0.25)

  // FALSE zone (bottom half of gap) — red
  ctx.fillStyle = "rgba(239,68,68,0.22)"
  ctx.fillRect(pipe.x, mid, PIPE_W, PIPE_GAP / 2)
  ctx.fillStyle = "#ef4444"
  ctx.fillText("FALSE", pipe.x + PIPE_W / 2, top + PIPE_GAP * 0.75)

  // Dashed divider
  ctx.strokeStyle = "rgba(255,255,255,0.35)"
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(pipe.x, mid)
  ctx.lineTo(pipe.x + PIPE_W, mid)
  ctx.stroke()
  ctx.setLineDash([])
}

/* ─── Pre-game screen ──────────────────────────────────────────────────────── */
function PreGame({ onStart, hasQuestions }: { onStart: () => void; hasQuestions: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
      <div className="text-6xl float-anim">🐦</div>
      <div>
        <h2 className="text-xl font-black text-foreground">Flappy Kaset Bird</h2>
        <p className="text-sm text-muted-foreground mt-1">
          True/False! Fly through the TOP (TRUE) or BOTTOM (FALSE) of each pipe to answer!
        </p>
      </div>

      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">Controls</p>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p><span className="inline-block bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground mr-1">Space</span> or <span className="inline-block bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground mr-1">↑</span> — Flap up</p>
          <p><span className="inline-block bg-background border border-border rounded px-1.5 py-0.5 font-mono text-foreground mr-1">Tap</span> — Flap (mobile)</p>
        </div>
      </div>

      <div className="w-full rounded-xl bg-secondary/60 p-4 text-left">
        <p className="text-xs font-bold text-foreground mb-2">How to play</p>
        <ol className="flex flex-col gap-1 text-xs text-muted-foreground list-decimal list-inside">
          <li>Read the question + suggested answer shown at the top</li>
          <li>Decide: is that suggested answer <strong className="text-foreground">TRUE</strong> or <strong className="text-foreground">FALSE</strong>?</li>
          <li>Fly through the <span className="text-accent font-semibold">GREEN top zone</span> = TRUE</li>
          <li>Fall through the <span className="text-destructive font-semibold">RED bottom zone</span> = FALSE</li>
          <li>Hitting the pipe walls costs a ❤️</li>
        </ol>
      </div>

      {!hasQuestions ? (
        <div className="w-full rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Upload study material in the sidebar to generate questions.
          </p>
          <Link href="/arena">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" /> Go to Hub
            </Button>
          </Link>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-2">
          <GenerateGameButton gameType="flappy" label="Flappy Bird" />
          <Button
            onClick={onStart}
            className="w-full btn-ku-green text-base font-bold py-3 min-h-12 pulse-green"
          >
            START GAME
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─── Post-game screen ─────────────────────────────────────────────────────── */
function PostGame({ score, total, onRestart }: { score: number; total: number; onRestart: () => void }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const grade = pct >= 90 ? "S" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 40 ? "C" : "D"
  const gradeColor = pct >= 90 ? "#f5c518" : pct >= 75 ? "#22c55e" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f97316" : "#ef4444"
  const xp = score * 15

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-5 text-center max-w-sm mx-auto">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full text-4xl font-black"
        style={{ background: gradeColor + "22", color: gradeColor, border: `3px solid ${gradeColor}` }}
      >
        {grade}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Final Score</p>
        <p className="text-4xl font-black text-foreground">{score}</p>
      </div>
      <div className="w-full grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground">Answered</p>
          <p className="text-lg font-bold text-foreground">{total}</p>
        </div>
        <div className="rounded-xl bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground">Accuracy</p>
          <p className="text-lg font-bold text-foreground">{pct}%</p>
        </div>
        <div className="rounded-xl bg-secondary/60 p-3">
          <p className="text-xs text-muted-foreground">XP</p>
          <p className="text-lg font-bold text-ku-gold">+{xp}</p>
        </div>
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
export function FlappyKasetGame() {
  const { questions, hasQuestions, gameQuestions } = useQuestions()
  const activeQuestions = gameQuestions["flappy"] ?? questions
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  const [gameState, setGameState] = useState<State>("pregame")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(MAX_LIVES)
  const [displayQ, setDisplayQ] = useState<TFQuestion | null>(null)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const countdownRef = useRef(3)

  // Game refs
  const birdRef = useRef({ x: 90, y: CH / 2, vy: 0, rot: 0, flapT: 0 })
  const pipesRef = useRef<Pipe[]>([])
  const pipeSpeedRef = useRef(PIPE_SPEED_BASE)
  const questionsRef = useRef<QuizQuestion[]>([])
  const qIdxRef = useRef(0)
  const scoreRef = useRef(0)
  const livesRef = useRef(MAX_LIVES)
  const stateRef = useRef<State>("pregame")
  const flashRef = useRef<{ correct: boolean; frame: number } | null>(null)
  const groundOffRef = useRef(0)
  const totalAnswRef = useRef(0)
  const displayQRef = useRef<TFQuestion | null>(null)

  useEffect(() => { stateRef.current = gameState }, [gameState])
  const { recordScore } = useScores()
  useEffect(() => { if (gameState === "result") recordScore("flappy", score) }, [gameState, score, recordScore])

  const startGame = useCallback(() => {
    birdRef.current = { x: 90, y: CH / 2, vy: 0, rot: 0, flapT: 0 }
    pipesRef.current = []
    pipeSpeedRef.current = PIPE_SPEED_BASE
    questionsRef.current = shuffle([...activeQuestions])
    qIdxRef.current = 0
    scoreRef.current = 0
    livesRef.current = MAX_LIVES
    totalAnswRef.current = 0
    flashRef.current = null
    groundOffRef.current = 0
    displayQRef.current = null
    frameRef.current = 0
    countdownRef.current = 3
    setScore(0)
    setLives(MAX_LIVES)
    setTotalAnswered(0)
    setDisplayQ(null)
    setGameState("countdown")
  }, [questions])

  // Countdown 3-2-1 before playing
  useEffect(() => {
    if (gameState !== "countdown") return
    countdownRef.current = 3
    const iv = setInterval(() => {
      countdownRef.current--
      if (countdownRef.current <= 0) {
        clearInterval(iv)
        setGameState("playing")
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [gameState])

  const flap = useCallback(() => {
    if (stateRef.current !== "playing") return
    birdRef.current.vy = FLAP
    birdRef.current.flapT = 8
  }, [])

  // Main game loop
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
      const bird = birdRef.current

      // ── Sky ──────────────────────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CH)
      if (st === "playing") {
        skyGrad.addColorStop(0, "#1a3a0a")
        skyGrad.addColorStop(1, "#336600")
      } else {
        skyGrad.addColorStop(0, "#0d1f06")
        skyGrad.addColorStop(1, "#1e4d0f")
      }
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, CW, CH)

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.15)"
      for (let i = 0; i < 20; i++) {
        ctx.fillRect(((i * 47 + frameRef.current * 0.1) % CW), (i * 31) % (CH * 0.6), 1, 1)
      }

      // ── Trees ────────────────────────────────────────────────────────────────
      for (let i = 0; i < 6; i++) {
        const tx = ((i * 90 + frameRef.current * 0.4) % (CW + 60)) - 30
        ctx.fillStyle = "#1e4d0f"
        ctx.beginPath()
        ctx.moveTo(tx, CH - 45); ctx.lineTo(tx + 20, CH - 90); ctx.lineTo(tx + 40, CH - 45)
        ctx.closePath(); ctx.fill()
        ctx.fillStyle = "#162211"
        ctx.fillRect(tx + 16, CH - 45, 8, 15)
      }

      // ── Ground ───────────────────────────────────────────────────────────────
      if (st === "playing") groundOffRef.current = (groundOffRef.current + pipeSpeedRef.current) % 24
      ctx.fillStyle = "#236b12"; ctx.fillRect(0, CH - 32, CW, 32)
      ctx.fillStyle = "#1a3a0a"; ctx.fillRect(0, CH - 32, CW, 4)
      for (let i = -1; i < CW / 24 + 1; i++) {
        ctx.fillStyle = "#2d8a18"
        ctx.fillRect(i * 24 - groundOffRef.current, CH - 27, 12, 5)
      }

      if (st === "playing") {
        // ── Physics ──────────────────────────────────────────────────────────
        bird.vy += GRAVITY
        bird.y += bird.vy
        bird.rot = Math.min(bird.vy * 0.07, 1.3)
        if (bird.flapT > 0) bird.flapT--

        // ── Spawn pipe ───────────────────────────────────────────────────────
        if (frameRef.current % 100 === 0) {
          if (qIdxRef.current >= questionsRef.current.length) {
            questionsRef.current = shuffle([...questionsRef.current])
            qIdxRef.current = 0
          }
          const gapTop = 90 + Math.random() * (CH - PIPE_GAP - 150)
          const tfq = mkTFQ(questionsRef.current[qIdxRef.current++])
          pipesRef.current.push({ x: CW + 10, gapTop, question: tfq, answered: false })
        }

        // ── Move & cull pipes ────────────────────────────────────────────────
        for (const p of pipesRef.current) p.x -= pipeSpeedRef.current
        pipesRef.current = pipesRef.current.filter(p => p.x + PIPE_W > -20)

        // ── Evaluate passage (pipe passed the bird) ───────────────────────────
        for (const p of pipesRef.current) {
          if (!p.answered && p.x + PIPE_W < bird.x) {
            p.answered = true
            if (p.question) {
              const mid = p.gapTop + PIPE_GAP / 2
              const choseTrue = bird.y < mid
              const correct = choseTrue === p.question.answer
              totalAnswRef.current++
              setTotalAnswered(totalAnswRef.current)
              if (correct) {
                scoreRef.current++
                setScore(scoreRef.current)
                if (scoreRef.current % SPEED_BUMP === 0) pipeSpeedRef.current += 0.15
                flashRef.current = { correct: true, frame: 18 }
              } else {
                livesRef.current = Math.max(0, livesRef.current - 1)
                setLives(livesRef.current)
                flashRef.current = { correct: false, frame: 18 }
                if (livesRef.current <= 0) {
                  setGameState("dead")
                  setTimeout(() => setGameState("result"), 1200)
                }
              }
            }
          }
        }

        // ── Update displayed question ─────────────────────────────────────────
        const nextPipe = pipesRef.current
          .filter(p => !p.answered && p.x + PIPE_W > bird.x - 20)
          .sort((a, b) => a.x - b.x)[0]
        const newQ = nextPipe?.question ?? null
        if (newQ !== displayQRef.current) {
          displayQRef.current = newQ
          setDisplayQ(newQ)
        }

        // ── Flash tick ───────────────────────────────────────────────────────
        if (flashRef.current && flashRef.current.frame > 0) flashRef.current.frame--

        // ── Pipe wall collision ───────────────────────────────────────────────
        for (const p of pipesRef.current) {
          const bL = bird.x - BIRD_R + 4
          const bR = bird.x + BIRD_R - 4
          const bT = bird.y - BIRD_R + 4
          const bB = bird.y + BIRD_R - 4
          if (bR > p.x && bL < p.x + PIPE_W) {
            if (bT < p.gapTop || bB > p.gapTop + PIPE_GAP) {
              livesRef.current = Math.max(0, livesRef.current - 1)
              setLives(livesRef.current)
              bird.vy = FLAP * 0.6
              bird.x = p.x - BIRD_R - 10
              if (livesRef.current <= 0) {
                setGameState("dead")
                setTimeout(() => setGameState("result"), 1200)
              }
            }
          }
        }

        // ── Ground / ceiling ─────────────────────────────────────────────────
        if (bird.y > CH - 32 - BIRD_R || bird.y < BIRD_R) {
          livesRef.current = Math.max(0, livesRef.current - 1)
          setLives(livesRef.current)
          bird.y = CH / 2; bird.vy = 0
          if (livesRef.current <= 0) {
            setGameState("dead")
            setTimeout(() => setGameState("result"), 1200)
          }
        }
      }

      // ── Draw pipes ───────────────────────────────────────────────────────────
      for (const p of pipesRef.current) drawPipe(ctx, p)

      // ── Draw bird ────────────────────────────────────────────────────────────
      if (st !== "result") drawOwl(ctx, bird.x, bird.y, bird.rot, bird.flapT > 0)

      // ── Question bar ─────────────────────────────────────────────────────────
      if (displayQRef.current && (st === "playing" || st === "dead")) {
        const q = displayQRef.current
        ctx.fillStyle = "rgba(13,31,6,0.88)"
        ctx.beginPath(); ctx.roundRect(8, 8, CW - 16, 72, 10); ctx.fill()
        ctx.strokeStyle = "rgba(106,171,53,0.4)"; ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(8, 8, CW - 16, 72, 10); ctx.stroke()

        ctx.fillStyle = "#e8f5d8"
        ctx.font = "bold 11px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        const qTxt = q.question
        ctx.fillText(qTxt.length > 58 ? qTxt.slice(0, 58) + "…" : qTxt, CW / 2, 26)

        ctx.fillStyle = "#f5c518"
        ctx.font = "bold 11px Inter, sans-serif"
        const ansTxt = `→ "${q.shownAnswer.length > 44 ? q.shownAnswer.slice(0, 44) + "…" : q.shownAnswer}"`
        ctx.fillText(ansTxt, CW / 2, 44)

        ctx.fillStyle = "rgba(159,212,106,0.65)"
        ctx.font = "10px Inter, sans-serif"
        ctx.fillText("▲ TOP = TRUE   |   BOTTOM = FALSE ▼", CW / 2, 66)
      }

      // ── HUD: score + lives ────────────────────────────────────────────────────
      if (st !== "pregame") {
        ctx.fillStyle = "#f5c518"
        ctx.font = "bold 26px Inter, sans-serif"
        ctx.textAlign = "right"; ctx.textBaseline = "top"
        ctx.fillText(String(scoreRef.current), CW - 12, 84)

        for (let i = 0; i < MAX_LIVES; i++) {
          ctx.font = "18px sans-serif"
          ctx.fillStyle = i < livesRef.current ? "#ef4444" : "rgba(239,68,68,0.2)"
          ctx.textAlign = "left"
          ctx.fillText("❤", 12 + i * 26, 84)
        }
      }

      // ── Screen flash ─────────────────────────────────────────────────────────
      if (flashRef.current && flashRef.current.frame > 0) {
        const alpha = (flashRef.current.frame / 18) * 0.25
        ctx.fillStyle = flashRef.current.correct ? `rgba(34,197,94,${alpha})` : `rgba(239,68,68,${alpha})`
        ctx.fillRect(0, 0, CW, CH)
      }

      // ── Countdown overlay ────────────────────────────────────────────────────
      if (st === "countdown") {
        ctx.fillStyle = "rgba(13,31,6,0.72)"
        ctx.fillRect(0, 0, CW, CH)
        ctx.fillStyle = "#9fd46a"
        ctx.font = "bold 22px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText("GET READY!", CW / 2, CH / 2 - 64)
        ctx.fillStyle = "#f5c518"
        ctx.font = "bold 90px Inter, sans-serif"
        ctx.fillText(String(Math.max(1, countdownRef.current)), CW / 2, CH / 2)
      }

      // ── Dead overlay ─────────────────────────────────────────────────────────
      if (st === "dead") {
        ctx.fillStyle = "rgba(13,31,6,0.55)"; ctx.fillRect(0, 0, CW, CH)
        ctx.fillStyle = "#ef4444"
        ctx.font = "bold 28px Inter, sans-serif"
        ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText("Game Over!", CW / 2, CH / 2)
      }

      requestAnimationFrame(loop)
    }

    loop()
    return () => { running = false }
  }, [gameState])

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [flap])

  if (gameState === "pregame") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">Flappy Kaset Bird</h1>
      </div>
      <PreGame onStart={startGame} hasQuestions={hasQuestions} />
    </div>
  )

  if (gameState === "result") return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">Flappy Kaset Bird</h1>
      </div>
      <PostGame score={score} total={totalAnswered} onRestart={startGame} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/arena"><Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-lg font-bold text-foreground">Flappy Kaset Bird</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="flex flex-col gap-3 shrink-0 mx-auto lg:mx-0">
          <div className="glass-card rounded-xl p-2">
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className="rounded-lg game-canvas block"
              onClick={flap}
              style={{ maxWidth: "100%", height: "auto", touchAction: "none" }}
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

          {displayQ && (
            <div className="glass-card rounded-xl p-4 border-l-4 border-ku-green-500">
              <p className="text-xs font-bold text-ku-green-500 uppercase tracking-widest mb-1">Question</p>
              <p className="text-sm font-semibold text-foreground mb-2">{displayQ.question}</p>
              <p className="text-xs text-muted-foreground mb-1">Suggested answer:</p>
              <p className="text-sm font-bold text-ku-gold mb-3">"{displayQ.shownAnswer}"</p>
              <div className="flex gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-md bg-accent/15 text-accent px-2 py-1 text-xs font-bold">▲ TOP = TRUE</span>
                <span className="inline-flex items-center rounded-md bg-destructive/15 text-destructive px-2 py-1 text-xs font-bold">▼ BOTTOM = FALSE</span>
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Controls</p>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <p><span className="font-mono bg-secondary px-1 rounded">Space / ↑</span> — Flap up</p>
              <p><span className="font-mono bg-secondary px-1 rounded">Tap</span> — Flap (mobile)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
