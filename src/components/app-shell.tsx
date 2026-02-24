"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { AiMentorChat } from "@/components/ai-mentor-chat"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Gamepad2, CalendarDays, BookOpen, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/arena", label: "Games", icon: Gamepad2 },
  { href: "/planner", label: "Plan", icon: CalendarDays },
  { href: "/flashcards", label: "Cards", icon: BookOpen },
  { href: "/quiz-battle", label: "Battle", icon: Bot },
]

function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="mobile-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-50
      bg-card/95 backdrop-blur-sm border-t border-border
      flex items-stretch">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-1 min-h-[56px] transition-colors",
              isActive
                ? "text-ku-green-500 dark:text-ku-green-200"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(51,102,0,0.5)]")} />
            <span className={cn(
              "text-[10px] font-medium leading-none",
              isActive ? "opacity-100" : "opacity-60"
            )}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Theme toggle — fixed top-right, always visible */}
      <ThemeToggle />

      {/* Main content */}
      <main className="lg:pl-64 pt-14 lg:pt-0 pb-16 lg:pb-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* AI Mentor floating chat */}
      <AiMentorChat />
    </div>
  )
}
