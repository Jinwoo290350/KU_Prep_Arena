// KU Prep — Data Types
// All fake/hardcoded data has been removed.
// Real data comes from user uploads and interactions.

export interface QuizQuestion {
  id: number
  question: string
  choices: [string, string, string, string]
  correct: number // 0-3 for A B C D
  explanation: string
  difficulty?: number // 1=easy, 2=medium, 3=hard
}

export interface UserProfile {
  name: string
  faculty: string
  xp: number
  maxXp: number
  level: number
  streak: number
  rank: string
  badges: string[]
}

export interface ExamEntry {
  id: number
  subject: string
  code: string
  date: string
  daysLeft: number
  progress: number
}

export interface LeaderboardEntry {
  rank: number
  name: string
  xp: number
  avatar: string
  badge: string | null
}

export interface StudyTask {
  id: number
  date: string
  subject: string
  topic: string
  duration: number
  completed: boolean
  time: string
}

export interface Flashcard {
  id: number
  front: string
  back: string
  subject: string
}

export interface ChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
}

// Empty defaults — populated by user input
export const emptyUserProfile: UserProfile = {
  name: "",
  faculty: "",
  xp: 0,
  maxXp: 1000,
  level: 1,
  streak: 0,
  rank: "Beginner",
  badges: [],
}
