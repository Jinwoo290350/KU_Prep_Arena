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
  Sparkles,
  CheckCircle2,
  LogIn,
  LogOut,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useQuestions } from "@/lib/questions-context"
import { UploadDialog } from "@/components/upload-dialog"
import { useSession, signIn, signOut } from "next-auth/react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/arena", label: "KU Arena", icon: Gamepad2 },
  { href: "/planner", label: "Smart Planner", icon: CalendarDays },
  { href: "/flashcards", label: "Flashcards", icon: BookOpen },
  { href: "/quiz-battle", label: "AI Mentor", icon: Bot },
  { href: "/fortune", label: "Daily Fortune", icon: Sparkles },
]

function UploadSection() {
  const { sources, hasQuestions, isGenerating } = useQuestions()
  const readyCount = sources.filter(s => s.status === "ready").length
  const loadingCount = sources.filter(s => s.status === "loading").length
  const selectedCount = sources.filter(s => s.selected && s.status === "ready").length

  return (
    <div className="px-3 mb-3">
      <UploadDialog>
        <button className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          hasQuestions
            ? "bg-ku-green-500/10 dark:bg-ku-green-800/40 text-ku-green-600 dark:text-ku-green-200 border border-ku-green-500/30 hover:bg-ku-green-500/15"
            : "bg-ku-green-500 text-white hover:bg-ku-green-600 dark:bg-ku-green-700 dark:hover:bg-ku-green-600"
        )}>
          {hasQuestions
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <Upload className={cn("h-4 w-4 shrink-0", isGenerating && "animate-spin")} />
          }
          <span className="truncate text-left flex-1">
            {loadingCount > 0
              ? `กำลังวิเคราะห์ ${loadingCount} ไฟล์…`
              : hasQuestions
              ? "แหล่งข้อมูล"
              : "เพิ่มเนื้อหาการเรียน"
            }
          </span>
          {readyCount > 0 && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
              hasQuestions
                ? "bg-ku-green-500/20 text-ku-green-600 dark:text-ku-green-300"
                : "bg-white/20 text-white"
            )}>
              {selectedCount}/{readyCount}
            </span>
          )}
        </button>
      </UploadDialog>
      {hasQuestions && (
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          {selectedCount} แหล่ง เลือกอยู่
          {loadingCount > 0 && <span className="ml-1 text-ku-gold">· โหลด {loadingCount} อยู่</span>}
        </p>
      )}
    </div>
  )
}

function UserSection() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="px-3 py-3 border-t border-border">
        <div className="h-9 rounded-lg bg-secondary animate-pulse" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="px-3 py-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => signIn("google")}
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign in with Google
        </Button>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? "User"}
            className="h-7 w-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-ku-green-500 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">
              {(session.user.name ?? "U")[0].toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">
            {session.user.name}
          </p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            {session.user.email}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground justify-start"
        onClick={() => signOut()}
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </Button>
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

        {/* User auth section */}
        <UserSection />
      </aside>
    </>
  )
}
