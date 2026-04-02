"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  Flame,
  RefreshCw,
  Plus,
  BookOpen,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useExams, daysUntil } from "@/lib/use-exams"

interface StudyTask {
  id: number
  topic: string
  subject: string
  date: string
  time: string
  duration: number
  completed: boolean
}

// ── Streak helpers ──────────────────────────────────────────────────────────
function loadStreak(): number {
  try {
    const data = JSON.parse(localStorage.getItem("ku-streak") ?? "{}")
    const today = new Date().toISOString().slice(0, 10)
    if (data.lastDate === today) return data.streak ?? 0
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (data.lastDate === yesterday) return data.streak ?? 0
    return 0
  } catch { return 0 }
}

function recordStreakDay() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const data = JSON.parse(localStorage.getItem("ku-streak") ?? "{}")
    if (data.lastDate === today) return
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const streak = data.lastDate === yesterday ? (data.streak ?? 0) + 1 : 1
    localStorage.setItem("ku-streak", JSON.stringify({ lastDate: today, streak }))
  } catch { /* ignore */ }
}

// ── Auto-generate study sessions ────────────────────────────────────────────
function generateSessions(
  exams: { id: string; subject: string; name: string; date: string }[],
  intensity: number
): StudyTask[] {
  const today = new Date().toISOString().slice(0, 10)
  const tasks: StudyTask[] = []
  let id = 1

  for (const exam of exams) {
    const days = daysUntil(exam.date)
    if (days < 0) continue
    const sessionCount = Math.min(Math.max(Math.ceil(Math.max(days, 1) * (intensity / 100) * 0.7), 1), 14)
    const step = Math.max(1, Math.floor(Math.max(days, 1) / sessionCount))
    const duration = intensity < 33 ? 15 : intensity < 66 ? 25 : 40

    for (let i = 0; i < sessionCount; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i * step)
      const dateStr = d.toISOString().slice(0, 10)
      if (dateStr > exam.date) break
      tasks.push({
        id: id++,
        topic: `Review: ${exam.name}`,
        subject: exam.subject,
        date: dateStr,
        time: `${String(18 + (i % 3)).padStart(2, "0")}:00`,
        duration,
        completed: false,
      })
    }
  }
  return tasks.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

// ── Add Exam Dialog ─────────────────────────────────────────────────────────
function AddExamDialog({ onAdd, onClose }: {
  onAdd: (subject: string, name: string, date: string) => void
  onClose: () => void
}) {
  const [subject, setSubject] = useState("")
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const minDate = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">Add Exam</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subject / วิชา</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics, CS101" autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Exam Name / ชื่อสอบ</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Midterm, Final Exam" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Exam Date / วันสอบ</label>
            <Input type="date" value={date} min={minDate} onChange={(e) => setDate(e.target.value)} className="text-foreground" />
          </div>
        </div>
        <Button
          onClick={() => { if (subject.trim() && name.trim() && date) { onAdd(subject.trim(), name.trim(), date); onClose() } }}
          disabled={!subject.trim() || !name.trim() || !date}
          className="btn-ku-green w-full font-semibold"
        >
          Add Exam
        </Button>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export function SmartPlannerContent() {
  const [intensity, setIntensity] = useState([50])
  const [showDialog, setShowDialog] = useState(false)
  const [streak, setStreak] = useState(0)
  const { exams, addExam, removeExam } = useExams()

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  useEffect(() => { setStreak(loadStreak()) }, [])

  const generatedTasks = useMemo(() => generateSessions(exams, intensity[0]), [exams, intensity])
  const [tasks, setTasks] = useState<StudyTask[]>([])

  useEffect(() => {
    setTasks((prev) => {
      const completedIds = new Set(prev.filter((t) => t.completed).map((t) => t.id))
      return generatedTasks.map((t) => ({ ...t, completed: completedIds.has(t.id) }))
    })
  }, [generatedTasks])

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (!t.completed) { recordStreakDay(); setStreak(loadStreak()) }
        return { ...t, completed: !t.completed }
      })
    )
  }

  const completedToday = tasks.filter((t) => t.date === today && t.completed).length
  const totalToday = tasks.filter((t) => t.date === today).length
  const intensityLabel = intensity[0] < 33 ? "Light" : intensity[0] < 66 ? "Moderate" : "Intensive"

  const groupedByDate = tasks.reduce((acc, task) => {
    if (!acc[task.date]) acc[task.date] = []
    acc[task.date].push(task)
    return acc
  }, {} as Record<string, StudyTask[]>)

  return (
    <div className="flex flex-col gap-6">
      {showDialog && (
        <AddExamDialog
          onAdd={(subject, name, date) => addExam({ subject, name, date })}
          onClose={() => setShowDialog(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Smart Planner</h1>
          </div>
          <p className="text-muted-foreground text-sm">AI-optimized micro-study sessions tailored to your schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setTasks(generateSessions(exams, intensity[0]))} className="border-border text-foreground hover:bg-secondary gap-2">
            <RefreshCw className="h-4 w-4" />
            Reschedule
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Exam
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{"Today's Progress"}</p>
            <p className="text-lg font-bold text-foreground">{completedToday}/{totalToday} sessions</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Study Streak</p>
            <p className="text-lg font-bold text-foreground">{streak} {streak === 1 ? "day" : "days"}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Intensity</p>
            <Badge variant="secondary" className={cn("border-0 text-[10px]",
              intensityLabel === "Light" ? "bg-accent/10 text-accent" :
              intensityLabel === "Moderate" ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive")}>
              {intensityLabel}
            </Badge>
          </div>
          <Slider value={intensity} onValueChange={setIntensity} max={100} step={1} className="mt-1" />
        </div>
      </div>

      {/* Upcoming Exams */}
      {exams.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upcoming Exams</p>
          <div className="flex flex-wrap gap-2">
            {exams.map((exam) => {
              const days = daysUntil(exam.date)
              return (
                <div key={exam.id} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{exam.name}</p>
                    <p className="text-xs text-muted-foreground">{exam.subject} · {exam.date}</p>
                  </div>
                  <Badge variant="secondary" className={cn("border-0 text-[10px] ml-1",
                    days <= 3 ? "bg-destructive/10 text-destructive" :
                    days <= 7 ? "bg-warning/10 text-warning" :
                    "bg-primary/10 text-primary")}>
                    {days <= 0 ? "Today!" : `${days}d`}
                  </Badge>
                  <button onClick={() => removeExam(exam.id)} className="text-muted-foreground hover:text-destructive ml-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {exams.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center border-2 border-dashed border-border">
          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold text-foreground">No exams added yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Add your upcoming exams to auto-generate a study schedule</p>
          <Button size="sm" onClick={() => setShowDialog(true)} className="btn-ku-green gap-2">
            <Plus className="h-4 w-4" />
            Add First Exam
          </Button>
        </div>
      )}

      {/* Calendar Schedule */}
      {Object.entries(groupedByDate).map(([date, dateTasks]) => {
        const isToday = date === today
        const isTomorrow = date === tomorrow
        const dateLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : date
        return (
          <Card key={date} className={cn("bg-card border-border", isToday && "border-primary/20")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-primary" />
                {dateLabel}
                {isToday && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px]">Active</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {dateTasks.map((task) => (
                  <button key={task.id} onClick={() => toggleTask(task.id)}
                    className={cn("flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all border",
                      task.completed ? "bg-accent/5 border-accent/20" : "bg-secondary/50 border-border hover:border-primary/30")}>
                    {task.completed ? <CheckCircle2 className="h-5 w-5 text-accent shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", task.completed ? "text-muted-foreground line-through" : "text-foreground")}>
                        {task.topic}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0 text-[10px] gap-1">
                          <BookOpen className="h-3 w-3" />{task.subject}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-mono">{task.time}</span>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px]">
                        {task.duration} min
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
