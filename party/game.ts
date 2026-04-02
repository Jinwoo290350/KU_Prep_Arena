import type * as Party from "partykit/server"

interface QuizQuestion {
  id: number
  question: string
  choices: [string, string, string, string]
  correct: number
  explanation: string
}

interface PlayerState {
  id: string
  name: string
  score: number
  answeredThisRound: boolean
}

interface LeaderboardEntry {
  name: string
  score: number
  rank: number
}

interface RoomState {
  phase: "lobby" | "playing" | "finished"
  players: Map<string, PlayerState>
  questions: QuizQuestion[]
  currentQuestionIndex: number
  hostId: string | null
  answers: Map<string, { answerIndex: number; timeLeft: number }>
  questionTimer: ReturnType<typeof setTimeout> | null
}

export default class GameServer implements Party.Server {
  private state: RoomState = {
    phase: "lobby",
    players: new Map(),
    questions: [],
    currentQuestionIndex: 0,
    hostId: null,
    answers: new Map(),
    questionTimer: null,
  }

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    if (!this.state.hostId) this.state.hostId = conn.id
    conn.send(JSON.stringify({
      type: "joined",
      playerId: conn.id,
      players: Array.from(this.state.players.values()),
    }))
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message) as {
      type: string
      playerName?: string
      questions?: QuizQuestion[]
      answerIndex?: number
      timeLeft?: number
    }

    if (msg.type === "join" && msg.playerName) {
      const player: PlayerState = {
        id: sender.id,
        name: msg.playerName,
        score: 0,
        answeredThisRound: false,
      }
      this.state.players.set(sender.id, player)
      this.room.broadcast(JSON.stringify({
        type: "player_joined",
        players: Array.from(this.state.players.values()),
      }))
    }

    if (msg.type === "set_questions" && msg.questions && sender.id === this.state.hostId) {
      this.state.questions = msg.questions.slice(0, 10)
    }

    if (msg.type === "start" && sender.id === this.state.hostId && this.state.questions.length > 0) {
      this.state.phase = "playing"
      this.state.currentQuestionIndex = 0
      this.broadcastQuestion()
    }

    if (msg.type === "answer" && this.state.phase === "playing" && msg.answerIndex !== undefined && msg.timeLeft !== undefined) {
      const player = this.state.players.get(sender.id)
      if (!player || player.answeredThisRound) return
      player.answeredThisRound = true
      this.state.answers.set(sender.id, { answerIndex: msg.answerIndex, timeLeft: msg.timeLeft })
      const answeredCount = Array.from(this.state.players.values()).filter(p => p.answeredThisRound).length
      this.room.broadcast(JSON.stringify({
        type: "answered_count",
        count: answeredCount,
        total: this.state.players.size,
      }))
      const allAnswered = answeredCount === this.state.players.size
      if (allAnswered) {
        if (this.state.questionTimer) clearTimeout(this.state.questionTimer)
        this.revealAnswer()
      }
    }
  }

  private broadcastQuestion() {
    const q = this.state.questions[this.state.currentQuestionIndex]
    if (!q) return
    this.state.answers.clear()
    for (const p of this.state.players.values()) p.answeredThisRound = false
    this.room.broadcast(JSON.stringify({
      type: "question",
      question: q,
      questionIndex: this.state.currentQuestionIndex,
      total: this.state.questions.length,
      timeLimit: 15,
    }))
    this.state.questionTimer = setTimeout(() => this.revealAnswer(), 16000)
  }

  private revealAnswer() {
    const q = this.state.questions[this.state.currentQuestionIndex]
    if (!q) return
    let fastestPlayer: string | null = null
    let fastestTime = -1
    for (const [playerId, ans] of this.state.answers.entries()) {
      if (ans.answerIndex === q.correct) {
        const player = this.state.players.get(playerId)!
        const points = 100 + Math.round(ans.timeLeft * 10)
        player.score += points
        if (ans.timeLeft > fastestTime) { fastestTime = ans.timeLeft; fastestPlayer = player.name }
      }
    }
    const scores: Record<string, number> = {}
    for (const [id, p] of this.state.players.entries()) scores[id] = p.score
    this.room.broadcast(JSON.stringify({ type: "reveal", correct: q.correct, scores, fastestPlayer }))
    setTimeout(() => {
      this.state.currentQuestionIndex++
      if (this.state.currentQuestionIndex >= this.state.questions.length) {
        this.broadcastResults()
      } else {
        this.broadcastQuestion()
      }
    }, 4000)
  }

  private broadcastResults() {
    this.state.phase = "finished"
    const leaderboard: LeaderboardEntry[] = Array.from(this.state.players.values())
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 }))
    this.room.broadcast(JSON.stringify({ type: "results", leaderboard }))
  }

  onClose(conn: Party.Connection) {
    this.state.players.delete(conn.id)
    if (this.state.players.size > 0) {
      this.room.broadcast(JSON.stringify({
        type: "player_joined",
        players: Array.from(this.state.players.values()),
      }))
    }
  }
}
