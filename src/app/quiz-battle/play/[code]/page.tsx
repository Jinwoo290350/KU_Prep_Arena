"use client"

import { use, useCallback, useEffect, useRef, useState } from "react"
import { usePartySocket } from "partysocket/react"
import { PARTYKIT_HOST } from "@/lib/party-types"
import type { ServerMessage } from "@/lib/party-types"
import type { QuizQuestion } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type PlayerPhase = "name-entry" | "lobby" | "question" | "answered" | "reveal" | "results"

interface LeaderboardEntry {
  name: string
  score: number
  rank: number
}

const CHOICE_LABELS = ["A", "B", "C", "D"]

// KU-themed button colors
const CHOICE_BASE = [
  "bg-red-500 active:bg-red-600 border-red-700",
  "bg-blue-500 active:bg-blue-600 border-blue-700",
  "bg-yellow-400 active:bg-yellow-500 border-yellow-600 text-yellow-900",
  "bg-[#006400] active:bg-green-800 border-green-900",
]
const CHOICE_CORRECT = "bg-green-500 border-green-700 ring-4 ring-green-300"
const CHOICE_WRONG = "bg-gray-400 border-gray-500"
const CHOICE_SELECTED_WRONG = "bg-red-600 border-red-800 ring-4 ring-red-300"

export default function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)

  const [phase, setPhase] = useState<PlayerPhase>("name-entry")
  const [nameInput, setNameInput] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)
  const [timeLimit, setTimeLimit] = useState(15)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const [scoreDelta, setScoreDelta] = useState<number>(0)
  const [totalScore, setTotalScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeLeftRef = useRef(15)

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: code,
    onOpen() {
      // We get playerId from the "joined" message
    },
    onMessage(evt: MessageEvent) {
      const msg = JSON.parse(evt.data as string) as ServerMessage

      if (msg.type === "joined") {
        setMyPlayerId(msg.playerId)
        setPlayers(msg.players.map((p) => ({ id: p.id, name: p.name })))
      }

      if (msg.type === "player_joined") {
        setPlayers(msg.players.map((p) => ({ id: p.id, name: p.name })))
      }

      if (msg.type === "question") {
        setPhase("question")
        setCurrentQuestion(msg.question)
        setQuestionIndex(msg.questionIndex)
        setTotalQuestions(msg.total)
        setTimeLimit(msg.timeLimit)
        setTimeLeft(msg.timeLimit)
        timeLeftRef.current = msg.timeLimit
        setSelectedAnswer(null)
        setCorrectIndex(null)
        setScoreDelta(0)

        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
          setTimeLeft((t) => {
            const next = t - 1
            timeLeftRef.current = next
            if (next <= 0) {
              if (timerRef.current) clearInterval(timerRef.current)
              return 0
            }
            return next
          })
        }, 1000)
      }

      if (msg.type === "reveal") {
        if (timerRef.current) clearInterval(timerRef.current)
        setPhase("reveal")
        setCorrectIndex(msg.correct)
        if (myPlayerId && msg.scores[myPlayerId] !== undefined) {
          const newScore = msg.scores[myPlayerId]
          setScoreDelta(newScore - totalScore)
          setTotalScore(newScore)
        }
      }

      if (msg.type === "results") {
        if (timerRef.current) clearInterval(timerRef.current)
        setPhase("results")
        setLeaderboard(msg.leaderboard)
      }
    },
  })

  // Re-subscribe myPlayerId effect because it's set async
  useEffect(() => {
    // nothing extra needed
  }, [myPlayerId])

  const handleJoin = useCallback(() => {
    const name = nameInput.trim()
    if (!name) return
    setPlayerName(name)
    socket.send(JSON.stringify({ type: "join", playerName: name }))
    setPhase("lobby")
  }, [nameInput, socket])

  const handleAnswer = useCallback(
    (index: number) => {
      if (phase !== "question") return
      if (timerRef.current) clearInterval(timerRef.current)
      setSelectedAnswer(index)
      setPhase("answered")
      socket.send(
        JSON.stringify({
          type: "answer",
          answerIndex: index,
          timeLeft: timeLeftRef.current,
        })
      )
    },
    [phase, socket]
  )

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // ── NAME ENTRY ─────────────────────────────────────────────────────────────
  if (phase === "name-entry") {
    return (
      <div className="min-h-screen bg-[#006400] flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center text-white">
          <p className="text-5xl mb-2">🎓</p>
          <h1 className="text-3xl font-black">KU Battle</h1>
          <p className="text-green-200 mt-1">Room: {code}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-4">
          <p className="text-center font-bold text-gray-700">Enter your name</p>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Your name…"
            className="text-center text-lg font-semibold"
            autoFocus
            maxLength={20}
          />
          <Button
            onClick={handleJoin}
            disabled={!nameInput.trim()}
            className="bg-[#006400] hover:bg-green-800 text-white font-black text-lg py-5 rounded-xl"
          >
            JOIN
          </Button>
        </div>
      </div>
    )
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-[#006400] flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-center text-white">
          <p className="text-5xl mb-2">✅</p>
          <h2 className="text-2xl font-black">You&apos;re in!</h2>
          <p className="text-green-200 mt-1 text-lg font-semibold">{playerName}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <p className="text-center text-sm text-gray-500 font-semibold mb-3">
            Players in room ({players.length})
          </p>
          <ul className="flex flex-wrap gap-2 justify-center mb-4">
            {players.map((p) => (
              <li
                key={p.id}
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  p.name === playerName
                    ? "bg-[#006400] text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {p.name}
              </li>
            ))}
          </ul>
          <p className="text-center text-muted-foreground text-sm animate-pulse">
            Waiting for host to start…
          </p>
        </div>
      </div>
    )
  }

  // ── QUESTION ───────────────────────────────────────────────────────────────
  if ((phase === "question" || phase === "answered") && currentQuestion) {
    const pct = (timeLeft / timeLimit) * 100
    const timerColor =
      pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-400" : "bg-red-500"

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Timer bar */}
        <div className="h-3 w-full bg-gray-800">
          <div
            className={`h-full transition-all duration-1000 ${timerColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-400 text-xs font-semibold">
            Q{questionIndex + 1}/{totalQuestions}
          </span>
          <span className="text-white text-2xl font-black">{timeLeft}s</span>
          <span className="text-gray-400 text-xs font-semibold">
            {totalScore} pts
          </span>
        </div>

        {/* Question */}
        <div className="px-4 py-4 flex-1 flex flex-col">
          <div className="bg-gray-900 rounded-2xl p-5 mb-6">
            <p className="text-white text-xl font-bold leading-snug text-center">
              {currentQuestion.question}
            </p>
          </div>

          {/* Answer buttons */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {currentQuestion.choices.map((choice, i) => {
              let cls = CHOICE_BASE[i]
              if (phase === "answered") {
                cls = "bg-gray-700 border-gray-600 opacity-60"
                if (i === selectedAnswer) cls = "bg-gray-600 border-gray-500 ring-4 ring-white/30"
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={phase === "answered"}
                  className={`rounded-2xl border-b-4 p-4 flex flex-col items-center justify-center gap-2 text-white font-bold transition-all active:scale-95 disabled:cursor-not-allowed min-h-[100px] ${cls}`}
                >
                  <span className="text-3xl font-black opacity-80">{CHOICE_LABELS[i]}</span>
                  <span className="text-sm leading-snug text-center">{choice}</span>
                </button>
              )
            })}
          </div>

          {phase === "answered" && (
            <p className="text-center text-gray-400 mt-4 animate-pulse text-sm font-semibold">
              Waiting for others…
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── REVEAL ─────────────────────────────────────────────────────────────────
  if (phase === "reveal" && currentQuestion) {
    const gotItRight = selectedAnswer === correctIndex

    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-6 px-4 transition-colors ${
          gotItRight ? "bg-green-700" : "bg-red-800"
        }`}
      >
        <div className="text-center text-white">
          <p className="text-6xl mb-2">{gotItRight ? "🎉" : "❌"}</p>
          <h2 className="text-3xl font-black">
            {gotItRight ? "Correct!" : "Wrong"}
          </h2>
          {gotItRight && scoreDelta > 0 && (
            <p className="text-xl font-bold text-green-200 mt-1">+{scoreDelta} points</p>
          )}
          <p className="text-lg font-semibold mt-1 opacity-80">
            Total: {totalScore} pts
          </p>
        </div>

        <div className="bg-white/10 rounded-2xl p-5 w-full max-w-sm">
          <p className="text-white/70 text-xs uppercase tracking-wide mb-2 text-center">
            Correct Answer
          </p>
          <p className="text-white font-bold text-center text-lg leading-snug">
            {CHOICE_LABELS[correctIndex!]}. {currentQuestion.choices[correctIndex!]}
          </p>
          <p className="text-white/70 text-sm mt-3 text-center leading-snug">
            {currentQuestion.explanation}
          </p>
        </div>

        <p className="text-white/50 text-sm animate-pulse">Next question coming…</p>
      </div>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === "results") {
    const myEntry = leaderboard.find((e) => e.name === playerName)
    const top3 = leaderboard.slice(0, 3)
    const rest = leaderboard.slice(3)
    const medals = ["🥇", "🥈", "🥉"]

    return (
      <div className="min-h-screen bg-[#006400] flex flex-col items-center gap-6 px-4 py-8">
        <div className="text-center text-white">
          <p className="text-4xl mb-1">🏆</p>
          <h2 className="text-3xl font-black">Game Over!</h2>
          {myEntry && (
            <p className="text-green-200 mt-2 text-lg font-bold">
              You finished #{myEntry.rank} with {myEntry.score} pts
            </p>
          )}
        </div>

        {/* Top 3 */}
        <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
          <ul className="flex flex-col gap-3">
            {top3.map((entry, i) => (
              <li
                key={entry.name}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  entry.name === playerName
                    ? "bg-yellow-50 border-2 border-yellow-400"
                    : "bg-gray-50"
                }`}
              >
                <span className="text-2xl">{medals[i]}</span>
                <span className="flex-1 font-bold truncate">{entry.name}</span>
                <span className="font-black text-[#006400]">{entry.score} pts</span>
              </li>
            ))}
          </ul>

          {rest.length > 0 && (
            <>
              <div className="border-t my-3" />
              <ul className="flex flex-col gap-2">
                {rest.map((entry) => (
                  <li
                    key={entry.name}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                      entry.name === playerName ? "bg-yellow-50 border border-yellow-400" : ""
                    }`}
                  >
                    <span className="text-gray-500 font-bold w-6 text-center text-sm">
                      {entry.rank}
                    </span>
                    <span className="flex-1 text-sm font-semibold truncate">{entry.name}</span>
                    <span className="text-sm font-bold text-[#006400]">{entry.score} pts</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <Button
          onClick={() => (window.location.href = "/")}
          variant="outline"
          className="bg-white text-[#006400] font-black border-0 px-8 py-4 text-lg rounded-xl hover:bg-green-50"
        >
          Back to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#006400] flex items-center justify-center">
      <p className="text-white animate-pulse">Connecting…</p>
    </div>
  )
}
