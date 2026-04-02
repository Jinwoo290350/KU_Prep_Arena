"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { usePartySocket } from "partysocket/react"
import { QRCodeSVG } from "qrcode.react"
import { useQuestions, DEMO_QUESTIONS } from "@/lib/questions-context"
import { PARTYKIT_HOST } from "@/lib/party-types"
import type { ServerMessage } from "@/lib/party-types"
import type { QuizQuestion } from "@/lib/mock-data"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

type HostPhase = "lobby" | "playing" | "reveal" | "results"

interface PlayerInfo {
  id: string
  name: string
  score: number
}

interface LeaderboardEntry {
  name: string
  score: number
  rank: number
}

const CHOICE_LABELS = ["A", "B", "C", "D"]
const CHOICE_COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600",
]
const CHOICE_CORRECT = "bg-green-500 ring-4 ring-green-300"
const CHOICE_WRONG = "bg-gray-400"

export default function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const { questions: ctxQuestions } = useQuestions()
  const questions: QuizQuestion[] = ctxQuestions.length > 0 ? ctxQuestions : DEMO_QUESTIONS

  const [phase, setPhase] = useState<HostPhase>("lobby")
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)
  const [timeLimit, setTimeLimit] = useState(15)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const [fastestPlayer, setFastestPlayer] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionsRef = useRef(questions)
  questionsRef.current = questions

  const playerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/quiz-battle/play/${code}`
      : `/quiz-battle/play/${code}`

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: code,
    onOpen() {
      socket.send(
        JSON.stringify({
          type: "set_questions",
          questions: questionsRef.current.slice(0, 10),
        })
      )
    },
    onMessage(evt: MessageEvent) {
      const msg = JSON.parse(evt.data as string) as ServerMessage
      if (msg.type === "joined" || msg.type === "player_joined") {
        setPlayers(
          msg.players.map((p) => ({ id: p.id, name: p.name, score: p.score }))
        )
      }
      if (msg.type === "question") {
        setPhase("playing")
        setCurrentQuestion(msg.question)
        setQuestionIndex(msg.questionIndex)
        setTotalQuestions(msg.total)
        setTimeLimit(msg.timeLimit)
        setTimeLeft(msg.timeLimit)
        setAnsweredCount(0)
        setCorrectIndex(null)
        setFastestPlayer(null)
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
              if (timerRef.current) clearInterval(timerRef.current)
              return 0
            }
            return t - 1
          })
        }, 1000)
      }
      if (msg.type === "reveal") {
        if (timerRef.current) clearInterval(timerRef.current)
        setPhase("reveal")
        setCorrectIndex(msg.correct)
        setFastestPlayer(msg.fastestPlayer)
        setScores(msg.scores)
        setPlayers((prev) =>
          prev.map((p) => ({ ...p, score: msg.scores[p.id] ?? p.score }))
        )
      }
      if (msg.type === "answered_count") {
        setAnsweredCount(msg.count)
      }
      if (msg.type === "results") {
        if (timerRef.current) clearInterval(timerRef.current)
        setPhase("results")
        setLeaderboard(msg.leaderboard)
      }
    },
  })

  const handleStart = useCallback(() => {
    socket.send(JSON.stringify({ type: "start" }))
  }, [socket])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-8 py-8 px-4 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-black text-ku-green-700 dark:text-ku-green-400">
              KU Battle Room
            </h1>
            <p className="text-muted-foreground mt-1">Players scan the QR or enter the code to join</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 w-full items-start justify-center">
            {/* QR + code */}
            <div className="flex flex-col items-center gap-4 bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-md">
              <QRCodeSVG value={playerUrl} size={200} />
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Room Code</p>
                <p className="text-5xl font-black tracking-widest text-ku-green-700 dark:text-ku-green-400">
                  {code}
                </p>
                <p className="text-xs text-muted-foreground mt-2 break-all max-w-[220px]">
                  {playerUrl}
                </p>
              </div>
            </div>

            {/* Player list */}
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-lg">Players</span>
                <Badge variant="secondary">{players.length}</Badge>
              </div>
              {players.length === 0 ? (
                <p className="text-muted-foreground text-sm">Waiting for players to join…</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <li
                      key={p.id}
                      className="px-3 py-1.5 rounded-full bg-ku-green-100 dark:bg-ku-green-900/40 text-ku-green-800 dark:text-ku-green-200 font-semibold text-sm"
                    >
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 text-sm text-muted-foreground">
                <p>{questions.slice(0, 10).length} questions ready</p>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleStart}
            disabled={players.length === 0}
            className="bg-ku-green-600 hover:bg-ku-green-700 text-white font-black text-xl px-14 py-6 rounded-2xl"
          >
            START GAME
          </Button>
        </div>
      </AppShell>
    )
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  if (phase === "playing" && currentQuestion) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6 py-6 px-4 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-semibold">
              Question {questionIndex + 1} / {totalQuestions}
            </span>
            <span className="text-2xl font-black text-ku-green-700 dark:text-ku-green-400">
              {timeLeft}s
            </span>
            <span className="text-sm text-muted-foreground">
              {answeredCount} / {players.length} answered
            </span>
          </div>

          {/* Timer bar */}
          <Progress
            value={(timeLeft / timeLimit) * 100}
            className="h-3 rounded-full"
          />

          {/* Question */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <p className="text-2xl font-bold leading-snug text-center">
              {currentQuestion.question}
            </p>
          </div>

          {/* Choices */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.choices.map((choice, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl p-4 text-white font-bold text-lg ${CHOICE_COLORS[i]}`}
              >
                <span className="text-2xl font-black opacity-70">{CHOICE_LABELS[i]}</span>
                <span className="text-base leading-snug">{choice}</span>
              </div>
            ))}
          </div>

          {/* Players */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {players.map((p) => (
              <span
                key={p.id}
                className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  // ── REVEAL ─────────────────────────────────────────────────────────────────
  if (phase === "reveal" && currentQuestion) {
    return (
      <AppShell>
        <div className="flex flex-col gap-6 py-6 px-4 max-w-3xl mx-auto">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Question {questionIndex + 1} / {totalQuestions}
            </p>
            <p className="text-xl font-bold">{currentQuestion.question}</p>
          </div>

          {/* Choices with reveal */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.choices.map((choice, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl p-4 text-white font-bold transition-all ${
                  i === correctIndex
                    ? CHOICE_CORRECT
                    : CHOICE_WRONG
                }`}
              >
                <span className="text-2xl font-black opacity-70">{CHOICE_LABELS[i]}</span>
                <span className="text-base leading-snug">{choice}</span>
                {i === correctIndex && <span className="ml-auto text-2xl">✓</span>}
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-800 dark:text-green-200">
            {currentQuestion.explanation}
          </div>

          {fastestPlayer && (
            <p className="text-center text-ku-green-700 dark:text-ku-green-400 font-bold">
              Fastest: {fastestPlayer}
            </p>
          )}

          {/* Score board */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[...players]
              .sort((a, b) => b.score - a.score)
              .slice(0, 6)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-card border rounded-lg px-3 py-2"
                >
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                  <span className="font-black text-ku-green-700 dark:text-ku-green-400 ml-2">
                    {scores[p.id] ?? p.score}
                  </span>
                </div>
              ))}
          </div>

          <p className="text-center text-muted-foreground text-sm animate-pulse">
            Next question in a moment…
          </p>
        </div>
      </AppShell>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === "results") {
    const top3 = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3)
    const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3
    const podiumHeights = ["h-24", "h-32", "h-16"]
    const podiumColors = [
      "bg-silver text-gray-700 dark:text-gray-200",
      "bg-yellow-400 text-yellow-900",
      "bg-amber-600 text-white",
    ]
    const medals = ["🥈", "🥇", "🥉"]

    return (
      <AppShell>
        <div className="flex flex-col items-center gap-8 py-8 px-4 max-w-2xl mx-auto">
          <div className="text-center">
            <p className="text-4xl mb-1">🏆</p>
            <h2 className="text-3xl font-black text-ku-green-700 dark:text-ku-green-400">
              Final Results
            </h2>
          </div>

          {/* Podium */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-3 w-full">
              {podiumOrder.map((entry, i) => (
                <div key={entry.name} className="flex flex-col items-center gap-2 flex-1">
                  <p className="text-2xl">{medals[i]}</p>
                  <p className="font-black text-sm text-center truncate w-full px-1">
                    {entry.name}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground">{entry.score} pts</p>
                  <div
                    className={`w-full rounded-t-xl ${podiumHeights[i]} ${podiumColors[i]} flex items-center justify-center text-2xl font-black`}
                  >
                    {i === 1 ? "1st" : i === 0 ? "2nd" : "3rd"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full leaderboard */}
          <div className="w-full">
            <h3 className="font-semibold mb-3 text-center text-muted-foreground uppercase tracking-wide text-xs">
              Full Leaderboard
            </h3>
            <ul className="flex flex-col gap-2">
              {leaderboard.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3"
                >
                  <span className="text-lg font-black text-muted-foreground w-8 text-center">
                    {entry.rank}
                  </span>
                  <span className="flex-1 font-semibold truncate">{entry.name}</span>
                  <span className="font-black text-ku-green-700 dark:text-ku-green-400">
                    {entry.score} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={() => window.location.href = "/quiz-battle"}
            className="font-semibold"
          >
            Back to Menu
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex items-center justify-center h-40">
        <p className="text-muted-foreground animate-pulse">Loading…</p>
      </div>
    </AppShell>
  )
}
