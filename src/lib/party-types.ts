import type { QuizQuestion } from "./mock-data"

export const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999"

export interface PlayerInfo {
  id: string
  name: string
  score: number
  answeredThisRound: boolean
}

export interface LeaderboardEntry {
  name: string
  score: number
  rank: number
}

export type ServerMessage =
  | { type: "joined"; playerId: string; players: PlayerInfo[] }
  | { type: "player_joined"; players: PlayerInfo[] }
  | { type: "question"; question: QuizQuestion; questionIndex: number; total: number; timeLimit: number }
  | { type: "reveal"; correct: number; scores: Record<string, number>; fastestPlayer: string | null }
  | { type: "results"; leaderboard: LeaderboardEntry[] }
  | { type: "answered_count"; count: number; total: number }

export type ClientMessage =
  | { type: "join"; playerName: string }
  | { type: "set_questions"; questions: QuizQuestion[] }
  | { type: "answer"; answerIndex: number; timeLeft: number }
  | { type: "start" }
