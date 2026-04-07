"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "ku-streak"

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastPlayDate: string // YYYY-MM-DD
  totalDays: number
}

const DEFAULT: StreakData = { currentStreak: 0, longestStreak: 0, lastPlayDate: "", totalDays: 0 }

function toDateStr(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function load(): StreakData {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") }
  } catch {
    return DEFAULT
  }
}

function save(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function computeNext(prev: StreakData): StreakData {
  const today = toDateStr()
  const yesterday = toDateStr(new Date(Date.now() - 86400000))

  if (prev.lastPlayDate === today) return prev // already recorded today

  let next: number
  if (prev.lastPlayDate === yesterday) {
    next = prev.currentStreak + 1
  } else {
    next = 1
  }

  return {
    currentStreak: next,
    longestStreak: Math.max(prev.longestStreak, next),
    lastPlayDate: today,
    totalDays: prev.totalDays + 1,
  }
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>(DEFAULT)

  useEffect(() => {
    setStreak(load())
  }, [])

  const recordStreak = useCallback(() => {
    setStreak(prev => {
      const next = computeNext(prev)
      if (next === prev) return prev
      save(next)
      return next
    })
  }, [])

  return { streak, recordStreak }
}
