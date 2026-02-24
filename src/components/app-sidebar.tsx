"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Gamepad2,
  CalendarDays,
  BookOpen,
  Menu,
  X,
  Leaf,
  Upload,
  Bot,
  AlertCircle,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useQuestions } from "@/lib/questions-context"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/arena", label: "KU Arena", icon: Gamepad2 },
  { href: "/planner", label: "Smart Planner", icon: CalendarDays },
  { href: "/flashcards", label: "Flashcards", icon: BookOpen },
  { href: "/quiz-battle", label: "AI Mentor", icon: Bot },
]

function UploadSection() {
  const {
    questions, setQuestions, setUploadedFileName, hasQuestions, uploadedFileName,
    setUploadedText, setSummary, isGenerating, setIsGenerating,
  } = useQuestions()
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploadedFileName(file.name)
    setIsGenerating(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/generate", { method: "POST", body: form })
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions ?? [])
        setSummary(data.summary ?? [])
        setUploadedText(data.extractedText ?? null)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to generate questions")
        setUploadedFileName(null)
      }
    } catch {
      setError("Network error — check connection")
      setUploadedFileName(null)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="px-3 mb-3">
      <label className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-all",
        hasQuestions
          ? "bg-ku-green-500/10 dark:bg-ku-green-800/40 text-ku-green-600 dark:text-ku-green-200 border border-ku-green-500/30"
          : "bg-ku-green-500 text-white hover:bg-ku-green-600 dark:bg-ku-green-700 dark:hover:bg-ku-green-600"
      )}>
        <Upload className={cn("h-4 w-4 shrink-0", isGenerating && "animate-spin")} />
        <span className="truncate">
          {isGenerating ? "Generating..." : hasQuestions ? (uploadedFileName || "Material loaded") : "Upload Material"}
        </span>
        <input
          type="file"
          className="sr-only"
          accept=".pdf,.txt,.docx"
          onChange={handleFileChange}
        />
      </label>
      {hasQuestions && !error && (
        <p className="text-[10px] text-muted-foreground mt-1 px-1 truncate">
          {uploadedFileName || "Study material"} · {questions.length} questions
        </p>
      )}
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5 px-1">
          <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
          <p className="text-[10px] text-destructive leading-tight">{error}</p>
        </div>
      )}
    </div>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ku-green-500">
            <Leaf className="h-4 w-4 text-ku-gold" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">KU Prep</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-foreground h-9 w-9"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 flex flex-col",
          "bg-card dark:bg-ku-green-900/95 border-r border-border",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ku-green-500 shadow-md">
            <Leaf className="h-5 w-5 text-ku-gold" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">KU Prep</h1>
            <p className="text-[11px] text-muted-foreground">Kasetsart University</p>
          </div>
        </div>

        {/* Upload Material — pinned above nav */}
        <div className="pt-4">
          <UploadSection />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Navigation
          </p>
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-ku-green-500/15 dark:bg-ku-green-700/40 text-ku-green-600 dark:text-ku-green-200 border-l-2 border-ku-green-500 pl-2.5"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-ku-green-500 dark:text-ku-green-300")} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="px-3 py-4 border-t border-border">
          <div className="rounded-xl border border-dashed border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">
              Upload study material above to generate quiz questions for all games.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
