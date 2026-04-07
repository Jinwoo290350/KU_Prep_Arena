"use client"

import {
  Upload,
  Gamepad2,
  CalendarDays,
  Trophy,
  TrendingUp,
  Plus,
  BookOpen,
  Clock,
  Trash2,
  Flame,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useQuestions } from "@/lib/questions-context"
import { useExams, daysUntil } from "@/lib/use-exams"
import { useScores, GAME_LABELS } from "@/lib/use-scores"
import { useStreak } from "@/lib/use-streak"

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
          <p className="text-sm font-semibold text-foreground">โหลดเนื้อหาแล้ว</p>
          <p className="text-xs text-muted-foreground truncate">{uploadedFileName} · {questions.length} ข้อ</p>
        </div>
        <Link href="/arena">
          <Button size="sm" className="btn-ku-green text-sm h-8 px-3">เล่นเกม</Button>
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
      <p className="text-sm font-semibold text-foreground mb-1">อัปโหลดเนื้อหาการเรียน</p>
      <p className="text-xs text-muted-foreground mb-4">
        กดปุ่ม <span className="font-semibold text-foreground">เพิ่มเนื้อหาการเรียน</span> ในแถบด้านข้างเพื่อสร้างข้อสอบ AI สำหรับทุกเกม
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
      <Link href="/arena" className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-ku-green-500/40 transition-all group border-l-4 border-ku-green-500">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ku-green-500/15 group-hover:bg-ku-green-500/25 transition-colors">
          <Gamepad2 className="h-5 w-5 text-ku-green-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">KU Arena</p>
          <p className="text-xs text-muted-foreground">เล่นเกมถาม-ตอบ</p>
        </div>
      </Link>
      <Link href="/planner" className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-ku-green-500/40 transition-all group border-l-4 border-ku-green-300/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ku-green-500/10 group-hover:bg-ku-green-500/20 transition-colors">
          <CalendarDays className="h-5 w-5 text-ku-green-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">ตารางเรียน</p>
          <p className="text-xs text-muted-foreground">วางแผนการเรียน</p>
        </div>
      </Link>
      <Link href="/flashcards" className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-ku-gold/40 transition-all group border-l-4 border-ku-gold/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ku-gold/10 group-hover:bg-ku-gold/20 transition-colors">
          <BookOpen className="h-5 w-5 text-ku-gold-dark dark:text-ku-gold" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Flashcards</p>
          <p className="text-xs text-muted-foreground">ทบทวนบทเรียน</p>
        </div>
      </Link>
    </div>
  )
}

/* ========================
   Upcoming Exams — localStorage-backed
   ======================== */
function ExamSection() {
  const { exams, addExam, removeExam } = useExams()
  const [adding, setAdding] = useState(false)
  const [subject, setSubject] = useState("")
  const [examName, setExamName] = useState("")
  const [date, setDate] = useState("")
  const today = new Date().toISOString().slice(0, 10)

  const handleAdd = () => {
    if (!subject || !date) return
    addExam({ subject, name: examName || subject, date })
    setSubject(""); setExamName(""); setDate(""); setAdding(false)
  }

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-ku-green-500" />
          ตารางสอบ
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)} className="text-muted-foreground h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> เพิ่ม
        </Button>
      </div>

      {adding && (
        <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border flex flex-col gap-2">
          <input
            className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ku-green-500"
            placeholder="วิชา (เช่น แคลคูลัส II)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            autoFocus
          />
          <input
            className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ku-green-500"
            placeholder="ชื่อการสอบ (เช่น สอบกลางภาค)"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
          />
          <input
            type="date"
            className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-ku-green-500"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button size="sm" onClick={handleAdd} disabled={!subject || !date} className="btn-ku-green w-full text-sm h-9">
            เพิ่มรายการสอบ
          </Button>
        </div>
      )}

      {exams.length === 0 ? (
        <EmptyState
          icon={<Clock />}
          title="ยังไม่มีตารางสอบ"
          description="เพิ่มวันสอบเพื่อนับถอยหลังและติดตามการเตรียมตัว"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {exams.map((exam) => {
            const days = daysUntil(exam.date)
            return (
              <div key={exam.id} className="rounded-lg bg-secondary/50 p-3 border border-border flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{exam.name}</p>
                  <p className="text-[10px] text-muted-foreground">{exam.subject} · {exam.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-ku-gold">{days <= 0 ? "วันนี้!" : days}</p>
                  {days > 0 && <p className="text-[10px] text-muted-foreground">วันที่เหลือ</p>}
                </div>
                <button onClick={() => removeExam(exam.id)} className="text-muted-foreground hover:text-destructive shrink-0 ml-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ========================
   Leaderboard — best scores per game from localStorage
   ======================== */
function LeaderboardCard() {
  const { bestScores } = useScores()
  const entries = Object.entries(GAME_LABELS)
    .map(([key, label]) => ({ key, label, score: bestScores[key] ?? null }))
    .filter((e) => e.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-ku-gold" />
        คะแนนสูงสุด
      </h3>
      {entries.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="ยังไม่มีคะแนน"
          description="เล่นเกมใน KU Arena เพื่อบันทึกคะแนนสูงสุดของคุณ"
          action={
            <Link href="/arena">
              <Button size="sm" className="btn-ku-green text-sm h-9 px-4">เล่นเลย</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e, i) => (
            <div key={e.key} className="rounded-lg bg-secondary/50 p-3 border border-border flex items-center gap-3">
              <span className="text-lg font-black text-muted-foreground w-6 text-center">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">{e.label}</span>
              <span className="font-black text-ku-green-700 dark:text-ku-green-400">{e.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ========================
   Motivation Card
   ======================== */
function StreakCard() {
  const { streak } = useStreak()
  const today = new Date().toISOString().slice(0, 10)
  const playedToday = streak.lastPlayDate === today

  return (
    <div className="rounded-xl p-4"
      style={{ background: "linear-gradient(135deg, rgba(255,100,0,0.08) 0%, rgba(255,60,0,0.04) 100%)", border: "1px solid rgba(255,100,0,0.25)" }}>
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 shrink-0">
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-0.5">Streak</p>
          <p className="text-2xl font-black text-foreground leading-none">
            {streak.currentStreak} <span className="text-sm font-normal text-muted-foreground">วันติดต่อกัน</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {playedToday
              ? "เล่นแล้ววันนี้"
              : streak.currentStreak > 0
                ? "ยังไม่ได้เล่นวันนี้ — อย่าให้ streak หาย!"
                : "เริ่มสาย streak วันนี้เลย"
            }
          </p>
        </div>
        {streak.longestStreak > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">สูงสุด</p>
            <p className="text-lg font-bold text-orange-400">{streak.longestStreak}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MotivationCard() {
  const tips = [
    "อัปโหลดเอกสารการเรียนเพื่อปลดล็อกเกม AI ทั้งหมด",
    "เรียนทุกวันสม่ำเสมอดีกว่าอัดก่อนสอบ — รักษา streak ไว้",
    "ใช้เกม Flappy Kaset เพื่อเปลี่ยนการอ่านแบบ passive เป็น active recall",
    "KU Arena ปรับตามเนื้อหาของคุณ — อัปโหลด PDF เพื่อ personalize ทุกเกม",
    "Flashcard + spaced repetition คือวิธีจำที่ได้ผลที่สุดทางวิทยาศาสตร์",
  ]
  const tip = tips[new Date().getDay() % tips.length]
  return (
    <div className="rounded-xl p-4"
      style={{ background: "linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(212,168,0,0.04) 100%)", border: "1px solid rgba(201,162,39,0.25)" }}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ku-gold/15 shrink-0">
          <TrendingUp className="h-4 w-4 text-ku-gold-dark dark:text-ku-gold" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-ku-gold uppercase tracking-widest mb-1">เคล็ดลับวันนี้</p>
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
    <div className="flex flex-col gap-5 min-h-[calc(100vh-10rem)]">
      <UploadBanner />
      <QuickActions />
      <StreakCard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ExamSection />
        <LeaderboardCard />
      </div>
      <MotivationCard />
    </div>
  )
}
