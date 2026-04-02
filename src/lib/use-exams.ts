"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"

export interface Exam {
  id: string
  subject: string
  name: string
  date: string // "YYYY-MM-DD"
}

function loadLocalExams(): Exam[] {
  try {
    return JSON.parse(localStorage.getItem("ku-exams") ?? "[]")
  } catch {
    return []
  }
}

function saveLocalExams(exams: Exam[]) {
  localStorage.setItem("ku-exams", JSON.stringify(exams))
}

export function useExams() {
  const { data: session } = useSession()
  const [exams, setExams] = useState<Exam[]>([])

  useEffect(() => {
    if (!session?.user?.email) {
      setExams(loadLocalExams())
      return
    }

    fetch("/api/exams")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.exams) {
          // API returns { id, name, date } — map name → subject for compatibility
          const mapped: Exam[] = data.exams.map(
            (e: { id: string; name: string; date: string }) => ({
              id: e.id,
              subject: e.name,
              name: e.name,
              date: e.date,
            })
          )
          setExams(mapped)
        }
      })
      .catch(() => {
        setExams(loadLocalExams())
      })
  }, [session?.user?.email])

  const addExam = useCallback(
    (e: Omit<Exam, "id">) => {
      if (session?.user?.email) {
        fetch("/api/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: e.name || e.subject, date: e.date }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.exam) {
              const newExam: Exam = {
                id: data.exam.id,
                subject: data.exam.name,
                name: data.exam.name,
                date: data.exam.date,
              }
              setExams((prev) =>
                [...prev, newExam].sort((a, b) => a.date.localeCompare(b.date))
              )
            }
          })
          .catch(() => {
            // Ignore errors silently
          })
      } else {
        const newExam: Exam = { ...e, id: Date.now().toString() }
        setExams((prev) => {
          const next = [...prev, newExam].sort((a, b) =>
            a.date.localeCompare(b.date)
          )
          saveLocalExams(next)
          return next
        })
      }
    },
    [session?.user?.email]
  )

  const removeExam = useCallback(
    (id: string) => {
      if (session?.user?.email) {
        fetch(`/api/exams?id=${id}`, { method: "DELETE" }).catch(() => {
          // Ignore errors silently
        })
        setExams((prev) => prev.filter((e) => e.id !== id))
      } else {
        setExams((prev) => {
          const next = prev.filter((e) => e.id !== id)
          saveLocalExams(next)
          return next
        })
      }
    },
    [session?.user?.email]
  )

  return { exams, addExam, removeExam }
}

/** Days between today and a target date string "YYYY-MM-DD" */
export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}
