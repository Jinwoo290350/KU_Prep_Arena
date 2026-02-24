"use client"

import { useState } from "react"
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Circle,
  Flame,
  Snowflake,
  RefreshCw,
  Plus,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import type { StudyTask } from "@/lib/mock-data"

export function SmartPlannerContent() {
  const [intensity, setIntensity] = useState([50])
  const [tasks, setTasks] = useState<StudyTask[]>([])

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const reschedule = () => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        duration: Math.max(10, Math.min(25, Math.round(t.duration * (0.8 + Math.random() * 0.4)))),
      }))
    )
  }

  const completedToday = tasks.filter((t) => t.date === "2026-02-20" && t.completed).length
  const totalToday = tasks.filter((t) => t.date === "2026-02-20").length

  const groupedByDate = tasks.reduce((acc, task) => {
    if (!acc[task.date]) acc[task.date] = []
    acc[task.date].push(task)
    return acc
  }, {} as Record<string, StudyTask[]>)

  const intensityLabel = intensity[0] < 33 ? "Light" : intensity[0] < 66 ? "Moderate" : "Intensive"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Smart Planner</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            AI-optimized micro-study sessions tailored to your schedule
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={reschedule} className="border-border text-foreground hover:bg-secondary gap-2">
            <RefreshCw className="h-4 w-4" />
            Reschedule
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="h-4 w-4" />
            Add Exam
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today{"'"}s Progress</p>
            <p className="text-lg font-bold text-foreground">{completedToday}/{totalToday} sessions</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Study Streak</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-foreground">0 days</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Intensity</p>
            <Badge variant="secondary" className={cn(
              "border-0 text-[10px]",
              intensityLabel === "Light" ? "bg-accent/10 text-accent" :
              intensityLabel === "Moderate" ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive"
            )}>
              {intensityLabel}
            </Badge>
          </div>
          <Slider
            value={intensity}
            onValueChange={setIntensity}
            max={100}
            step={1}
            className="mt-1"
          />
        </div>
      </div>

      {/* Calendar Schedule */}
      <div className="flex flex-col gap-4">
        {Object.entries(groupedByDate).map(([date, dateTasks]) => {
          const isToday = date === "2026-02-20"
          const dateLabel = isToday ? "Today" : date === "2026-02-21" ? "Tomorrow" : date
          return (
            <Card key={date} className={cn("bg-card border-border", isToday && "border-primary/20")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {dateLabel}
                  {isToday && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px]">
                      Active
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {dateTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all border",
                        task.completed
                          ? "bg-accent/5 border-accent/20"
                          : "bg-secondary/50 border-border hover:border-primary/30"
                      )}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          task.completed ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          {task.topic}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0 text-[10px] gap-1">
                            <BookOpen className="h-3 w-3" />
                            {task.subject}
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

      {/* Streak info */}
      <div className="glass-card rounded-xl p-5 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
          <Snowflake className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Streak Freeze</p>
          <p className="text-sm text-foreground leading-relaxed">
            {"Don't worry if you miss a day! Your streak won't reset — it freezes instead. Come back anytime and pick up where you left off."}
          </p>
        </div>
      </div>
    </div>
  )
}
