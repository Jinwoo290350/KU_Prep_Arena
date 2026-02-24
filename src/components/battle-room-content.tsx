"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { QuizQuestion } from "@/lib/mock-data"
import { useQuestions } from "@/lib/questions-context"
import { Swords, Copy, Users, Trophy, Crown, Medal, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Phase = "lobby" | "waiting" | "playing" | "result"

interface Player {
  id: string
  name: string
  score: number
  answered: boolean
  isMe: boolean
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const BOTS: Omit<Player, "score" | "answered">[] = [
  { id: "b1", name: "Titaree K.", isMe: false },
  { id: "b2", name: "Nattaphong P.", isMe: false },
  { id: "b3", name: "Krit L.", isMe: false },
]

export function BattleRoomContent() {
  const { questions: uploadedQuestions } = useQuestions()
  const sourceQuestions = uploadedQuestions
  const [phase, setPhase] = useState<Phase>("lobby")
  const [roomCode, setRoomCode] = useState("")
  const [players, setPlayers] = useState<Player[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timer, setTimer] = useState(15)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentQ = questions[qIdx] || null

  const createRoom = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(code)
    const me: Player = { id: "me", name: "You", score: 0, answered: false, isMe: true }
    const bots = BOTS.map((b) => ({ ...b, score: 0, answered: false }))
    setPlayers([me, ...bots])
    setQuestions(shuffled(sourceQuestions).slice(0, 8))
    setQIdx(0)
    setPhase("waiting")
  }, [])

  const startBattle = useCallback(() => {
    setTimer(15)
    setSelected(null)
    setPlayers((p) => p.map((pl) => ({ ...pl, answered: false })))
    setPhase("playing")
  }, [])

  // Timer + bot answers
  useEffect(() => {
    if (phase !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          // Time up -> move to next or result
          setTimeout(() => {
            if (qIdx + 1 >= questions.length) {
              setPhase("result")
            } else {
              setQIdx((i) => i + 1)
              setTimer(15)
              setSelected(null)
              setPlayers((p) => p.map((pl) => ({ ...pl, answered: false })))
            }
          }, 1500)
          return 0
        }
        // Simulate bots answering
        if (t === 12 || t === 9 || t === 6) {
          setPlayers((prev) => {
            const updated = [...prev]
            const unansweredBots = updated.filter((p) => !p.isMe && !p.answered)
            if (unansweredBots.length > 0) {
              const bot = unansweredBots[Math.floor(Math.random() * unansweredBots.length)]
              const botIdx = updated.findIndex((p) => p.id === bot.id)
              if (botIdx >= 0) {
                updated[botIdx] = { ...updated[botIdx], answered: true }
                const correct = Math.random() > 0.4
                if (correct) {
                  updated[botIdx].score += 100
                }
              }
            }
            return updated
          })
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, qIdx, questions.length])

  const handleAnswer = useCallback((choiceIdx: number) => {
    if (selected !== null || !currentQ) return
    setSelected(choiceIdx)
    const isCorrect = choiceIdx === currentQ.correct
    setPlayers((prev) => {
      const updated = [...prev]
      const meIdx = updated.findIndex((p) => p.isMe)
      if (meIdx >= 0) {
        updated[meIdx] = {
          ...updated[meIdx],
          answered: true,
          score: updated[meIdx].score + (isCorrect ? 100 + timer * 10 : 0),
        }
      }
      return updated
    })
  }, [selected, currentQ, timer])

  const sorted = [...players].sort((a, b) => b.score - a.score)
  const medalIcons = [Crown, Medal, Medal]

  if (phase === "lobby") {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="text-center">
          <Swords className="h-12 w-12 text-ku-gold mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">KU Battle</h1>
          <p className="text-sm text-muted-foreground">Compete against other players in real-time</p>
        </div>
        <div className="glass-card rounded-xl p-6">
          <Button onClick={createRoom} className="w-full btn-ku-green text-foreground mb-4">
            Create Room
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Enter room code"
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <Button variant="outline" className="border-border text-foreground hover:bg-secondary" onClick={createRoom}>
              Join
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "waiting") {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Room: {roomCode}</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => navigator.clipboard.writeText(roomCode)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Copy className="h-3 w-3" /> Copy code
            </button>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-ku-lime" />
            <span className="text-sm font-semibold text-foreground">Players ({players.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ku-green/20 text-ku-lime text-xs font-bold">
                  {p.name.charAt(0)}
                </div>
                <span className="text-sm text-foreground flex-1">{p.name}</span>
                {p.isMe && <Badge className="bg-ku-gold/20 text-ku-gold border-ku-gold/30 text-xs">You</Badge>}
              </div>
            ))}
          </div>
        </div>
        <Button onClick={startBattle} className="btn-ku-green text-foreground">
          Start Battle
        </Button>
      </div>
    )
  }

  if (phase === "result") {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-ku-gold mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Battle Complete!</h2>
        </div>
        <div className="glass-card rounded-xl p-5">
          {sorted.map((p, i) => {
            const Icon = i < 3 ? medalIcons[i] : null
            const colors = ["text-ku-gold", "text-gray-400", "text-amber-700"]
            return (
              <div key={p.id} className={`flex items-center gap-3 rounded-lg px-3 py-3 mb-2 ${
                p.isMe ? "bg-ku-green/10 border border-ku-green/20" : "bg-secondary/50"
              }`}>
                <span className={`text-lg font-bold w-8 text-center ${i < 3 ? colors[i] : "text-muted-foreground"}`}>
                  {Icon ? <Icon className={`h-5 w-5 inline ${colors[i]}`} /> : `#${i + 1}`}
                </span>
                <span className="text-sm font-medium text-foreground flex-1">{p.name}</span>
                <span className="text-sm font-bold text-ku-lime font-mono">{p.score}</span>
                {p.isMe && <Badge className="bg-ku-gold/20 text-ku-gold border-ku-gold/30 text-xs">You</Badge>}
              </div>
            )
          })}
        </div>
        <Button onClick={() => setPhase("lobby")} className="btn-ku-green text-foreground">
          Back to Lobby
        </Button>
      </div>
    )
  }

  // Playing phase
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-4">
        {/* Timer + progress */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="border-border text-muted-foreground text-xs">
            Q{qIdx + 1}/{questions.length}
          </Badge>
          <div className="flex items-center gap-2 text-ku-gold">
            <div className="h-2 flex-1 min-w-[120px] bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${(timer / 15) * 100}%`,
                  background: timer > 5 ? "linear-gradient(90deg, #336600, #7bc043)" : "#ef4444",
                }}
              />
            </div>
            <span className="text-sm font-bold font-mono w-8 text-right">{timer}s</span>
          </div>
        </div>

        {/* Question */}
        {currentQ && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">{currentQ.question}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.choices.map((choice, i) => {
                const letter = ["A", "B", "C", "D"][i]
                let cls = "glass-card rounded-lg p-4 text-left transition-all flex items-start gap-3"
                if (selected !== null) {
                  if (i === currentQ.correct) cls += " border-ku-lime/50 bg-ku-lime/10"
                  else if (i === selected) cls += " border-destructive/50 bg-destructive/10"
                  else cls += " opacity-50"
                } else {
                  cls += " hover:border-ku-lime/30 cursor-pointer"
                }
                return (
                  <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null} className={cls}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-foreground text-xs font-bold shrink-0">
                      {letter}
                    </span>
                    <span className="text-sm text-foreground mt-0.5">{choice}</span>
                    {selected !== null && i === currentQ.correct && <CheckCircle2 className="h-5 w-5 text-ku-lime ml-auto shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-ku-gold" /> Scoreboard
          </h3>
          <div className="flex flex-col gap-2">
            {sorted.map((p) => (
              <div key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                p.isMe ? "bg-ku-green/10" : ""
              }`}>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                  {p.name.charAt(0)}
                </div>
                <span className="flex-1 text-foreground text-xs truncate">{p.name}</span>
                {p.answered && <CheckCircle2 className="h-3 w-3 text-ku-lime" />}
                <span className="text-xs font-mono text-ku-lime">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
