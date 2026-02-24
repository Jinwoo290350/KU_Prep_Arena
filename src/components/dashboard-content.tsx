"use client"

import {
  Upload,
  Gamepad2,
  CalendarDays,
  Trophy,
  TrendingUp,
  Clock,
  Plus,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useQuestions } from "@/lib/questions-context"

/* ========================
   Empty State Component
   ======================== */
function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="text-4xl opacity-40">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ========================
   Upload Banner
   ======================== */
function UploadBanner() {
  const { hasQuestions, uploadedFileName, questions } = useQuestions()

  if (hasQuestions) {
    return (
      <div className="glass-card rounded-xl p-4 border-l-4 border-ku-green-500 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ku-green-500/15">
          <BookOpen className="h-4 w-4 text-ku-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Study material loaded</p>
          <p className="text-xs text-muted-foreground truncate">{uploadedFileName} · {questions.length} questions</p>
        </div>
        <Link href="/arena">
          <Button size="sm" className="btn-ku-green text-sm h-8 px-3">
            Play Games
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-xl p-5 border-2 border-dashed border-border text-center">
      <div className="flex justify-center mb-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ku-green-500/10">
          <Upload className="h-5 w-5 text-ku-green-500" />
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">Upload your study material</p>
      <p className="text-xs text-muted-foreground mb-4">
        Use the <span className="font-semibold text-foreground">Upload Material</span> button in the sidebar to generate AI quiz questions for all games.
      </p>
    </div>
  )
}

/* ========================
   Quick Actions
   ======================== */
function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Link
        href="/arena"
        className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-ku-green-500/40 transition-all group border-l-4 border-ku-green-500"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ku-green-500/15 group-hover:bg-ku-green-500/25 transition-colors">
          <Gamepad2 className="h-5 w-5 text-ku-green-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">KU Arena</p>
          <p className="text-xs text-muted-foreground">Play quiz games</p>
        </div>
      </Link>
      <Link
        href="/planner"
        className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-ku-green-500/40 transition-all group border-l-4 border-ku-green-300/50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ku-green-500/10 group-hover:bg-ku-green-500/20 transition-colors">
          <CalendarDays className="h-5 w-5 text-ku-green-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Study Planner</p>
          <p className="text-xs text-muted-foreground">Plan your schedule</p>
        </div>
      </Link>
      <Link
        href="/flashcards"
        className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-ku-gold/40 transition-all group border-l-4 border-ku-gold/50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ku-gold/10 group-hover:bg-ku-gold/20 transition-colors">
          <BookOpen className="h-5 w-5 text-ku-gold-dark dark:text-ku-gold" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Flashcards</p>
          <p className="text-xs text-muted-foreground">Review concepts</p>
        </div>
      </Link>
    </div>
  )
}

/* ========================
   Upcoming Exams (empty state)
   ======================== */
function ExamSection() {
  const [exams, setExams] = useState<{ subject: string; date: string; id: number }[]>([])
  const [adding, setAdding] = useState(false)
  const [subject, setSubject] = useState("")
  const [date, setDate] = useState("")

  const addExam = () => {
    if (!subject || !date) return
    const daysLeft = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    setExams((prev) => [...prev, { subject, date, id: Date.now() }])
    setSubject("")
    setDate("")
    setAdding(false)
    void daysLeft
  }

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-ku-green-500" />
          Upcoming Exams
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAdding(!adding)}
          className="text-muted-foreground h-7 text-xs gap-1"
        >
          <Plus className="h-3 w-3" /> Add Exam
        </Button>
      </div>

      {adding && (
        <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border flex flex-col gap-2">
          <input
            className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ku-green-500"
            placeholder="Subject name (e.g. Calculus II)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <input
            type="date"
            className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-ku-green-500"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button size="sm" onClick={addExam} className="btn-ku-green w-full text-sm h-9">
            Add
          </Button>
        </div>
      )}

      {exams.length === 0 ? (
        <EmptyState
          icon={<Clock />}
          title="No upcoming exams"
          description="Add your exam dates to track your countdown and preparation progress."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {exams.map((exam) => {
            const daysLeft = Math.max(
              0,
              Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            )
            return (
              <div key={exam.id} className="rounded-lg bg-secondary/50 p-3 border border-border flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{exam.subject}</p>
                <div className="text-right">
                  <p className="text-base font-bold text-ku-gold">{daysLeft}</p>
                  <p className="text-[10px] text-muted-foreground">days left</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ========================
   Leaderboard (empty state)
   ======================== */
function LeaderboardCard() {
  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-ku-gold" />
        Leaderboard
      </h3>
      <EmptyState
        icon="🏆"
        title="No scores yet"
        description="Play games in KU Arena to appear on the leaderboard and track your ranking."
        action={
          <Link href="/arena">
            <Button size="sm" className="btn-ku-green text-sm h-9 px-4">
              Play Now
            </Button>
          </Link>
        }
      />
    </div>
  )
}

/* ========================
   Motivation Card
   ======================== */
function MotivationCard() {
  const tips = [
    "Upload your study notes to unlock AI-powered quiz games. 🎮",
    "Consistent practice beats last-minute cramming — study a little every day. 📅",
    "Use the Flappy Bird game to turn passive reading into active recall. 🐦",
    "The KU Arena adapts to YOUR material — upload PDFs to personalize every game. 📚",
    "Spaced repetition (Flashcards) is the scientifically proven way to remember more. 🧠",
  ]
  const tip = tips[new Date().getDay() % tips.length]

  return (
    <div className="glass-card rounded-xl p-4 border-l-4 border-ku-gold">
      <div className="flex items-start gap-3">
        <TrendingUp className="h-4 w-4 text-ku-gold mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] font-bold text-ku-gold uppercase tracking-widest mb-1">Daily Tip</p>
          <p className="text-sm text-foreground leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  )
}

/* ========================
   Dashboard Content
   ======================== */
export function DashboardContent() {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to KU Prep</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI-powered exam preparation platform. Upload study material to get started.
        </p>
      </div>

      {/* Upload Banner — primary CTA */}
      <UploadBanner />

      {/* Quick Actions */}
      <QuickActions />

      {/* Two-column grid on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ExamSection />
        <LeaderboardCard />
      </div>

      {/* Daily tip */}
      <MotivationCard />
    </div>
  )
}
