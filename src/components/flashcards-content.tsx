"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useQuestions } from "@/lib/questions-context"
import type { QuizQuestion } from "@/lib/mock-data"

function toFlashcard(q: QuizQuestion) {
  const answerText = q.choices[q.correct] ?? ""
  return { front: q.question, back: answerText }
}

export function FlashcardsContent() {
  const { hasQuestions, questions, uploadedFileName, summary } = useQuestions()

  const flashcards = questions.map(toFlashcard)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-6 w-6 text-ku-green-500" />
          <h1 className="text-2xl font-bold text-foreground">Summary & Flashcards</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {hasQuestions
            ? `${flashcards.length} flashcards from "${uploadedFileName ?? "uploaded material"}"`
            : "Upload study material from the sidebar to generate AI summaries and flashcards."}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="summary" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <FileText className="h-4 w-4 mr-1.5" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Flashcards
          </TabsTrigger>
          <TabsTrigger value="study" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Study Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <SummaryView hasQuestions={hasQuestions} flashcards={flashcards} uploadedFileName={uploadedFileName} aiSummary={summary} />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          <FlashcardDeck flashcards={flashcards} hasQuestions={hasQuestions} />
        </TabsContent>

        <TabsContent value="study" className="mt-4">
          <StudyMode hasQuestions={hasQuestions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type SimpleCard = { front: string; back: string }

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="flex flex-col items-center gap-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground mb-1">No material uploaded yet</p>
          <p className="text-sm text-muted-foreground">
            Use the <span className="font-semibold">Upload Material</span> button in the sidebar to generate {label}.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryView({
  hasQuestions,
  flashcards,
  uploadedFileName,
  aiSummary,
}: {
  hasQuestions: boolean
  flashcards: SimpleCard[]
  uploadedFileName: string | null
  aiSummary: string[]
}) {
  if (!hasQuestions) return <EmptyState label="an AI summary" />

  const bullets = aiSummary.length > 0
    ? aiSummary
    : flashcards.map((fc) => fc.front)

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground text-base">
            AI Summary — {uploadedFileName ?? "Uploaded Material"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {bullets.map((point, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">Source:</span> {uploadedFileName ?? "Uploaded material"} ·{" "}
            {flashcards.length} key concepts extracted
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function FlashcardDeck({
  flashcards,
  hasQuestions,
}: {
  flashcards: SimpleCard[]
  hasQuestions: boolean
}) {
  const [queue, setQueue] = useState<SimpleCard[]>(() => [...flashcards])
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)

  // Reset queue when flashcards change (new questions loaded)
  useEffect(() => {
    setQueue([...flashcards])
    setPos(0)
    setFlipped(false)
  }, [flashcards])

  if (!hasQuestions) return <EmptyState label="flashcards" />

  const card = queue[pos]

  const goNext = () => {
    setFlipped(false)
    setPos(p => (p + 1) % queue.length)
  }

  const goPrev = () => {
    setFlipped(false)
    setPos(p => (p - 1 + queue.length) % queue.length)
  }

  const handlePass = () => {
    // Move current card to end of queue (re-study later)
    setFlipped(false)
    const newQueue = [...queue]
    const [passed] = newQueue.splice(pos, 1)
    newQueue.push(passed)
    setQueue(newQueue)
    if (pos >= newQueue.length) setPos(0)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono">{pos + 1} / {queue.length}</span>
      </div>

      <div className="flip-card w-full max-w-lg cursor-pointer" onClick={() => setFlipped(!flipped)}>
        <div className={cn("flip-card-inner relative", flipped && "flipped")} style={{ minHeight: "220px" }}>
          <div className="flip-card-front absolute inset-0 glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-3">Question</p>
            <p className="text-lg font-semibold text-foreground leading-relaxed">{card.front}</p>
            <p className="text-xs text-muted-foreground mt-4">Tap to flip</p>
          </div>
          <div className="flip-card-back absolute inset-0 glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center border-accent/20">
            <p className="text-xs text-accent font-semibold uppercase tracking-wide mb-3">Answer</p>
            <p className="text-sm text-foreground leading-relaxed">{card.back}</p>
            <p className="text-xs text-muted-foreground mt-4">Tap to flip</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={goPrev} className="border-border text-foreground hover:bg-secondary">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePass}
          className="gap-1.5 border-warning/60 text-warning hover:bg-warning/10 px-3"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Pass
        </Button>
        <Button variant="outline" size="icon" onClick={() => setFlipped(!flipped)} className="border-border text-foreground hover:bg-secondary">
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={goNext} className="border-border text-foreground hover:bg-secondary">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

function StudyMode({ hasQuestions }: { hasQuestions: boolean }) {
  const { summary, questions, uploadedFileName } = useQuestions()

  if (!hasQuestions) return <EmptyState label="a study plan" />

  const topics = summary.length > 0
    ? summary
    : questions.map(q => q.question.slice(0, 100))

  const n = topics.length

  const getLevel = (i: number) => {
    if (i < Math.ceil(n * 0.33))
      return {
        label: "Start Here",
        textColor: "text-accent",
        badgeCls: "bg-accent/10 text-accent",
        rowCls: "bg-accent/5 border-accent/20",
      }
    if (i < Math.ceil(n * 0.67))
      return {
        label: "Build On",
        textColor: "text-primary",
        badgeCls: "bg-primary/10 text-primary",
        rowCls: "bg-primary/5 border-primary/20",
      }
    return {
      label: "Advanced",
      textColor: "text-warning",
      badgeCls: "bg-warning/10 text-warning",
      rowCls: "bg-secondary/40 border-border",
    }
  }

  const estMinutes = Math.max(10, n * 5)

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground text-base">
              Reading Plan — {uploadedFileName ?? "Uploaded Material"}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Study these topics in order for the best results
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {topics.map((topic, i) => {
            const lv = getLevel(i)
            return (
              <div key={i} className={`flex gap-3 items-start p-3 rounded-xl border ${lv.rowCls}`}>
                <div className={`flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-xs font-bold shrink-0 mt-0.5 ${lv.textColor}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold mb-1 ${lv.badgeCls}`}>
                    {lv.label}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{topic}</p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Study Session</p>
              <p className="text-sm text-muted-foreground">
                {n} topics · {questions.length} practice questions · ~{estMinutes} min
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex flex-col gap-1 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-0.5">Tips</p>
            <p>• Master <span className="text-accent font-medium">Start Here</span> topics first — they are foundational</p>
            <p>• Use the <span className="text-foreground font-medium">Flashcards</span> tab to self-test after each topic</p>
            <p>• Play quiz games to reinforce <span className="text-warning font-medium">Advanced</span> topics</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
