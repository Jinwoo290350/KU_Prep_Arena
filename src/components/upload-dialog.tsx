"use client"

import { useState, useRef } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Upload, Link2, Youtube, FileText, AlertCircle,
  CheckCircle2, Loader2, X, FileUp,
} from "lucide-react"
import { useQuestions } from "@/lib/questions-context"
import type { QuizQuestion } from "@/lib/mock-data"

type TabId = "file" | "gdrive" | "youtube" | "text"

const TABS: { id: TabId; label: string; icon: React.ElementType; placeholder?: string }[] = [
  { id: "file",    label: "ไฟล์",         icon: FileUp },
  { id: "gdrive",  label: "Google Drive", icon: Link2 },
  { id: "youtube", label: "YouTube",      icon: Youtube },
  { id: "text",    label: "วางข้อความ",   icon: FileText },
]

interface UploadDialogProps {
  children: React.ReactNode
}

export function UploadDialog({ children }: UploadDialogProps) {
  const {
    setQuestions, setUploadedFileName, setUploadedText,
    setSummary, setIsGenerating, setGameQuestions,
  } = useQuestions()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabId>("file")
  const [url, setUrl] = useState("")
  const [textInput, setTextInput] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStatus("idle")
    setError(null)
    setUrl("")
  }

  async function processFile(file: File) {
    if (!file) return
    setStatus("loading")
    setError(null)
    setUploadedFileName(file.name)
    setIsGenerating(true)

    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/generate", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate questions")
      applyResult(data)
      setStatus("success")
      setTimeout(() => setOpen(false), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
      setStatus("error")
      setUploadedFileName(null)
    } finally {
      setIsGenerating(false)
    }
  }

  async function processUrl(type: "gdrive" | "youtube") {
    if (!url.trim()) return
    setStatus("loading")
    setError(null)
    setIsGenerating(true)
    const label = type === "gdrive" ? "Google Drive" : "YouTube"
    setUploadedFileName(`${label}: ${url.slice(0, 40)}…`)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), urlType: type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate questions")
      applyResult(data)
      setStatus("success")
      setTimeout(() => setOpen(false), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
      setStatus("error")
      setUploadedFileName(null)
    } finally {
      setIsGenerating(false)
    }
  }

  async function processText() {
    if (textInput.trim().length < 50) {
      setError("ข้อความน้อยเกินไป กรุณาใส่อย่างน้อย 50 ตัวอักษร")
      return
    }
    setStatus("loading")
    setError(null)
    setIsGenerating(true)
    setUploadedFileName("ข้อความที่วาง")

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate questions")
      applyResult(data)
      setStatus("success")
      setTimeout(() => setOpen(false), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด")
      setStatus("error")
      setUploadedFileName(null)
    } finally {
      setIsGenerating(false)
    }
  }

  function applyResult(data: Record<string, unknown>) {
    setQuestions((data.questions as QuizQuestion[]) ?? [])
    setSummary((data.summary as string[]) ?? [])
    setUploadedText((data.extractedText as string | null) ?? null)
    if (data.allGameQuestions) {
      Object.entries(data.allGameQuestions as Record<string, unknown[]>).forEach(([type, qs]) => {
        if (Array.isArray(qs)) setGameQuestions(type, qs as QuizQuestion[])
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-120 p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-ku-green-500" />
            เพิ่มเนื้อหาการเรียน
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            อัพโหลดไฟล์ หรือวางลิงก์ / ข้อความเพื่อสร้างข้อสอบ AI
          </p>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border bg-muted/30">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); reset() }}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all",
                tab === t.id
                  ? "text-ku-green-600 dark:text-ku-green-300 border-b-2 border-ku-green-500 bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* ── File tab ─────────────────────────────────────────────────── */}
          {tab === "file" && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) processFile(f)
                }}
              />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files[0]
                  if (f) processFile(f)
                }}
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
                  dragOver
                    ? "border-ku-green-500 bg-ku-green-500/5"
                    : "border-border hover:border-ku-green-500/60 hover:bg-muted/40"
                )}
              >
                <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                <p className="font-medium text-sm mb-1">ลากไฟล์มาวางที่นี่</p>
                <p className="text-xs text-muted-foreground">หรือคลิกเพื่อเลือกไฟล์</p>
                <p className="text-[11px] text-muted-foreground/60 mt-2">รองรับ PDF · DOCX · TXT</p>
              </div>
            </div>
          )}

          {/* ── Google Drive tab ──────────────────────────────────────────── */}
          {tab === "gdrive" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <Link2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  วาง URL ของ <strong>Google Docs / Slides / Sheet</strong> ที่แชร์แบบ
                  <span className="text-blue-400"> "ทุกคนที่มีลิงก์"</span>
                </p>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background
                  text-sm placeholder:text-muted-foreground focus:outline-none
                  focus:ring-2 focus:ring-ku-green-500/50"
              />
              <Button
                onClick={() => processUrl("gdrive")}
                disabled={!url.trim() || status === "loading"}
                className="w-full"
              >
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />กำลังโหลด...</>
                  : "ดึงเนื้อหาจาก Google Drive"
                }
              </Button>
            </div>
          )}

          {/* ── YouTube tab ───────────────────────────────────────────────── */}
          {tab === "youtube" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <Youtube className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  วาง URL ของวิดีโอ YouTube ที่มี <span className="text-red-400">คำบรรยาย (subtitle)</span>
                  เปิดใช้งาน จะดึง transcript มาสร้างข้อสอบ
                </p>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background
                  text-sm placeholder:text-muted-foreground focus:outline-none
                  focus:ring-2 focus:ring-ku-green-500/50"
              />
              <Button
                onClick={() => processUrl("youtube")}
                disabled={!url.trim() || status === "loading"}
                className="w-full"
              >
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />กำลังโหลด...</>
                  : "ดึง Transcript จาก YouTube"
                }
              </Button>
            </div>
          )}

          {/* ── Text tab ─────────────────────────────────────────────────── */}
          {tab === "text" && (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="วางเนื้อหาที่ต้องการสร้างข้อสอบจาก...&#10;&#10;รองรับภาษาไทยและอังกฤษ"
                rows={8}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background
                  text-sm placeholder:text-muted-foreground resize-none focus:outline-none
                  focus:ring-2 focus:ring-ku-green-500/50 font-sans"
              />
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs",
                  textInput.length < 50 ? "text-muted-foreground" : "text-ku-green-500"
                )}>
                  {textInput.length} / 50 ตัวอักษรขั้นต่ำ
                </span>
                {textInput.length > 0 && (
                  <button
                    onClick={() => setTextInput("")}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> ล้าง
                  </button>
                )}
              </div>
              <Button
                onClick={processText}
                disabled={textInput.trim().length < 50 || status === "loading"}
                className="w-full"
              >
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />กำลังสร้าง...</>
                  : "สร้างข้อสอบจากข้อความ"
                }
              </Button>
            </div>
          )}

          {/* ── Status messages ───────────────────────────────────────────── */}
          {status === "loading" && tab === "file" && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin text-ku-green-500 shrink-0" />
              <p className="text-sm text-muted-foreground">กำลังวิเคราะห์เนื้อหาและสร้างข้อสอบ…</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-600 dark:text-green-400">สร้างข้อสอบสำเร็จแล้ว!</p>
            </div>
          )}

          {status === "error" && error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
