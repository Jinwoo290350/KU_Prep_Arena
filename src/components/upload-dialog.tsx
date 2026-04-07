"use client"

import { useState, useRef, useCallback } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Plus, FileText, Link2, Youtube, Search,
  Loader2, CheckCircle2, AlertCircle, Trash2,
  FileUp, LayoutGrid, Check, RefreshCw,
} from "lucide-react"
import { useQuestions, type Source } from "@/lib/questions-context"
import type { QuizQuestion } from "@/lib/mock-data"

interface UploadDialogProps {
  children: React.ReactNode
}

/* ── helpers ────────────────────────────────────────────────────── */
function fileIcon(name: string) {
  if (name.toLowerCase().endsWith(".pdf")) return "📄"
  if (name.toLowerCase().endsWith(".docx")) return "📝"
  if (name.startsWith("YouTube:")) return "🎬"
  if (name.startsWith("Google Drive:")) return "🔗"
  return "📋"
}

function SourceRow({
  source,
  onToggle,
  onRemove,
  onRetry,
}: {
  source: Source
  onToggle: () => void
  onRemove: () => void
  onRetry?: () => void
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
      source.selected ? "bg-secondary/60" : "hover:bg-secondary/30"
    )}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all",
          source.selected
            ? "bg-ku-green-500 border-ku-green-500 text-white"
            : "border-border hover:border-ku-green-500/60"
        )}
        disabled={source.status === "loading"}
      >
        {source.selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Icon */}
      <span className="text-base shrink-0 select-none">{fileIcon(source.name)}</span>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">{source.name}</p>
        {source.status === "loading" && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Loader2 className="h-2.5 w-2.5 animate-spin" /> กำลังวิเคราะห์…
          </p>
        )}
        {source.status === "ready" && (
          <p className="text-[10px] text-ku-green-500 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" /> {source.questions.length} ข้อ พร้อมแล้ว
          </p>
        )}
        {source.status === "error" && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] text-destructive flex items-center gap-1 truncate">
              <AlertCircle className="h-2.5 w-2.5 shrink-0" /> {source.error ?? "เกิดข้อผิดพลาด"}
            </p>
            {onRetry && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry() }}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0 underline underline-offset-2"
              >
                <RefreshCw className="h-2.5 w-2.5" /> ลองใหม่
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
        disabled={source.status === "loading"}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ── Add Source Sub-panel ────────────────────────────────────────── */
type AddTab = "file" | "gdrive" | "youtube" | "text"

function AddSourcePanel({ onClose, onRegisterRetry }: {
  onClose: () => void
  onRegisterRetry: (id: string, fn: () => void) => void
}) {
  const { addSource, updateSource } = useQuestions()
  const [tab, setTab] = useState<AddTab>("file")
  const [url, setUrl] = useState("")
  const [textInput, setTextInput] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const submitToApi = useCallback(async (
    id: string,
    body: FormData | string,
    isJson: boolean,
  ) => {
    updateSource(id, { status: "loading", error: undefined })
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        ...(isJson
          ? { headers: { "Content-Type": "application/json" }, body: body as string }
          : { body: body as FormData }),
      })
      if (!res.ok) {
        let msg = `เกิดข้อผิดพลาด (${res.status})`
        try { msg = (await res.json()).error ?? msg } catch { /* no-op */ }
        updateSource(id, { status: "error", error: msg })
        return
      }
      const data = await res.json() as {
        questions?: QuizQuestion[]
        allGameQuestions?: Record<string, QuizQuestion[]>
        summary?: string[]
        extractedText?: string
      }
      updateSource(id, {
        status: "ready",
        questions: data.questions ?? [],
        gameQuestions: data.allGameQuestions ?? {},
        summary: data.summary ?? [],
        text: data.extractedText ?? "",
      })
    } catch (e) {
      updateSource(id, { status: "error", error: e instanceof Error ? e.message : "Network error" })
    }
  }, [updateSource])

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      const id = addSource(file.name)
      const form = new FormData()
      form.append("file", file)
      onRegisterRetry(id, () => submitToApi(id, form, false))
      submitToApi(id, form, false)
    }
    onClose()
  }

  function handleUrl(type: "gdrive" | "youtube") {
    if (!url.trim()) return
    const label = type === "gdrive" ? "Google Drive" : "YouTube"
    const id = addSource(`${label}: ${url.slice(0, 40)}…`)
    const payload = JSON.stringify({ url: url.trim(), urlType: type })
    onRegisterRetry(id, () => submitToApi(id, payload, true))
    submitToApi(id, payload, true)
    onClose()
  }

  function handleText() {
    if (textInput.trim().length < 50) return
    const preview = textInput.trim().slice(0, 30)
    const id = addSource(`ข้อความ: ${preview}…`)
    const payload = JSON.stringify({ text: textInput.trim() })
    onRegisterRetry(id, () => submitToApi(id, payload, true))
    submitToApi(id, payload, true)
    onClose()
  }

  const TABS: { id: AddTab; label: string; icon: React.ElementType }[] = [
    { id: "file",    label: "ไฟล์",         icon: FileUp },
    { id: "gdrive",  label: "Google Drive", icon: Link2 },
    { id: "youtube", label: "YouTube",      icon: Youtube },
    { id: "text",    label: "วางข้อความ",   icon: FileText },
  ]

  return (
    <div className="border-t border-border">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/30">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all",
              tab === t.id
                ? "text-ku-green-600 dark:text-ku-green-300 border-b-2 border-ku-green-500 bg-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* ── File ── */}
        {tab === "file" && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.docx"
              multiple
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                dragOver
                  ? "border-ku-green-500 bg-ku-green-500/5"
                  : "border-border hover:border-ku-green-500/60 hover:bg-muted/40"
              )}
            >
              <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="font-medium text-sm mb-1">ลากไฟล์มาวางที่นี่</p>
              <p className="text-xs text-muted-foreground">เลือกได้หลายไฟล์พร้อมกัน</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1.5">PDF · DOCX · TXT</p>
            </div>
          </>
        )}

        {/* ── Google Drive ── */}
        {tab === "gdrive" && (
          <div className="space-y-2.5">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Link2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                วาง URL ของ <strong>Google Docs / Slides / Sheet</strong> ที่แชร์แบบ
                <span className="text-blue-400"> "ทุกคนที่มีลิงก์"</span>
              </p>
            </div>
            <input
              type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ku-green-500/50"
            />
            <Button onClick={() => handleUrl("gdrive")} disabled={!url.trim()} className="w-full btn-ku-green">
              เพิ่มจาก Google Drive
            </Button>
          </div>
        )}

        {/* ── YouTube ── */}
        {tab === "youtube" && (
          <div className="space-y-2.5">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <Youtube className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                วาง URL ของวิดีโอ YouTube ที่มี<span className="text-red-400"> คำบรรยาย (subtitle)</span>
              </p>
            </div>
            <input
              type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm
                placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ku-green-500/50"
            />
            <Button onClick={() => handleUrl("youtube")} disabled={!url.trim()} className="w-full btn-ku-green">
              เพิ่มจาก YouTube
            </Button>
          </div>
        )}

        {/* ── Text ── */}
        {tab === "text" && (
          <div className="space-y-2.5">
            <textarea
              value={textInput} onChange={(e) => setTextInput(e.target.value)}
              placeholder="วางเนื้อหาที่ต้องการสร้างข้อสอบ..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm
                placeholder:text-muted-foreground resize-none focus:outline-none
                focus:ring-2 focus:ring-ku-green-500/50"
            />
            <div className="flex items-center justify-between">
              <span className={cn("text-xs", textInput.length < 50 ? "text-muted-foreground" : "text-ku-green-500")}>
                {textInput.length} / 50 ตัวอักษรขั้นต่ำ
              </span>
            </div>
            <Button
              onClick={handleText}
              disabled={textInput.trim().length < 50}
              className="w-full btn-ku-green"
            >
              เพิ่มข้อความนี้
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Dialog ─────────────────────────────────────────────────── */
export function UploadDialog({ children }: UploadDialogProps) {
  const { sources, toggleSource, toggleAll, removeSource } = useQuestions()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const retryRegistry = useRef<Map<string, () => void>>(new Map())

  const registerRetry = useCallback((id: string, fn: () => void) => {
    retryRegistry.current.set(id, fn)
  }, [])

  const allSelected = sources.length > 0 && sources.every(s => s.selected)
  const filtered = search.trim()
    ? sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : sources

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowAdd(false); setSearch("") } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-105 p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4 text-ku-green-500" />
            แหล่งข้อมูล
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {sources.length === 0
              ? "เพิ่มไฟล์เพื่อสร้างข้อสอบ AI"
              : `${sources.filter(s => s.selected).length} / ${sources.length} เลือกอยู่`}
          </p>
        </DialogHeader>

        {/* Add button */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <Button
            onClick={() => setShowAdd(!showAdd)}
            variant={showAdd ? "secondary" : "default"}
            className={cn("w-full gap-2 h-9 text-sm", !showAdd && "btn-ku-green")}
          >
            <Plus className="h-4 w-4" />
            {showAdd ? "ยกเลิก" : "+ เพิ่มแหล่งข้อมูล"}
          </Button>
        </div>

        {/* Add sub-panel */}
        {showAdd && <AddSourcePanel onClose={() => setShowAdd(false)} onRegisterRetry={registerRetry} />}

        {/* Source list */}
        {sources.length > 0 && !showAdd && (
          <>
            {/* Search */}
            <div className="px-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาแหล่งข้อมูล..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-muted/30
                    placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ku-green-500/50"
                />
              </div>
            </div>

            {/* Select all row */}
            <div className="flex items-center gap-2 px-4 pb-2 shrink-0">
              <button
                onClick={() => toggleAll(!allSelected)}
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all",
                  allSelected
                    ? "bg-ku-green-500 border-ku-green-500 text-white"
                    : "border-border hover:border-ku-green-500/60"
                )}
              >
                {allSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </button>
              <span className="text-xs text-muted-foreground">เลือกแหล่งข้อมูลทั้งหมด</span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 min-h-0">
              {filtered.map(source => (
                <SourceRow
                  key={source.id}
                  source={source}
                  onToggle={() => toggleSource(source.id)}
                  onRemove={() => removeSource(source.id)}
                  onRetry={retryRegistry.current.get(source.id)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">ไม่พบแหล่งข้อมูล</p>
              )}
            </div>
          </>
        )}

        {/* Empty state */}
        {sources.length === 0 && !showAdd && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="h-14 w-14 rounded-2xl bg-ku-green-500/10 flex items-center justify-center">
              <FileUp className="h-6 w-6 text-ku-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ยังไม่มีแหล่งข้อมูล</p>
              <p className="text-xs text-muted-foreground mt-1">กดปุ่ม + เพิ่มแหล่งข้อมูล เพื่อเริ่มต้น</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
