"use client"

import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("ku-theme")
    const dark = saved ? saved === "dark" : true
    setIsDark(dark)
    if (dark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggle = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("ku-theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("ku-theme", "light")
    }
  }

  if (!mounted) return null

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed top-3 right-4 z-[200] flex items-center justify-center w-10 h-10 rounded-full
        bg-white/90 dark:bg-ku-green-800/90 backdrop-blur-sm
        border border-border shadow-md
        text-ku-green-600 dark:text-ku-green-200
        hover:bg-ku-green-100 dark:hover:bg-ku-green-700
        transition-all duration-200"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
