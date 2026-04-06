"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import type { QuizQuestion } from "./mock-data"

export interface Source {
  id: string
  name: string
  status: "loading" | "ready" | "error"
  questions: QuizQuestion[]
  gameQuestions: Partial<Record<string, QuizQuestion[]>>
  text: string
  summary: string[]
  error?: string
  selected: boolean
}

interface QuestionsContextType {
  // Multi-source
  sources: Source[]
  addSource: (name: string) => string
  updateSource: (id: string, patch: Partial<Omit<Source, "id">>) => void
  removeSource: (id: string) => void
  toggleSource: (id: string) => void
  toggleAll: (select: boolean) => void

  // Derived from selected ready sources
  questions: QuizQuestion[]
  gameQuestions: Partial<Record<string, QuizQuestion[]>>
  hasQuestions: boolean
  uploadedText: string | null
  summary: string[]
  isGenerating: boolean

  // Used by GenerateGameButton
  setGameQuestions: (gameType: string, q: QuizQuestion[]) => void

  // Legacy display compat
  uploadedFileName: string | null
}

const QuestionsContext = createContext<QuestionsContextType>({
  sources: [],
  addSource: () => "",
  updateSource: () => {},
  removeSource: () => {},
  toggleSource: () => {},
  toggleAll: () => {},
  questions: [],
  gameQuestions: {},
  hasQuestions: false,
  uploadedText: null,
  summary: [],
  isGenerating: false,
  setGameQuestions: () => {},
  uploadedFileName: null,
})

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<Source[]>([])

  const addSource = useCallback((name: string): string => {
    const id = `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setSources(prev => [
      ...prev,
      { id, name, status: "loading", questions: [], gameQuestions: {}, text: "", summary: [], selected: true },
    ])
    return id
  }, [])

  const updateSource = useCallback((id: string, patch: Partial<Omit<Source, "id">>) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])

  const removeSource = useCallback((id: string) => {
    setSources(prev => prev.filter(s => s.id !== id))
  }, [])

  const toggleSource = useCallback((id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s))
  }, [])

  const toggleAll = useCallback((select: boolean) => {
    setSources(prev => prev.map(s => ({ ...s, selected: select })))
  }, [])

  const selectedReady = useMemo(() => sources.filter(s => s.selected && s.status === "ready"), [sources])

  const questions = useMemo(() => selectedReady.flatMap(s => s.questions), [selectedReady])

  const gameQuestions = useMemo<Partial<Record<string, QuizQuestion[]>>>(() => {
    const merged: Partial<Record<string, QuizQuestion[]>> = {}
    for (const source of selectedReady) {
      for (const [type, qs] of Object.entries(source.gameQuestions)) {
        if (Array.isArray(qs) && qs.length > 0) {
          merged[type] = [...(merged[type] ?? []), ...qs]
        }
      }
    }
    return merged
  }, [selectedReady])

  const uploadedText = useMemo(() => {
    const texts = selectedReady.map(s => s.text).filter(Boolean)
    if (texts.length === 0) return null
    return texts.join("\n\n---\n\n").slice(0, 12000)
  }, [selectedReady])

  const summary = useMemo(() => selectedReady.flatMap(s => s.summary).slice(0, 8), [selectedReady])

  const isGenerating = useMemo(() => sources.some(s => s.status === "loading"), [sources])

  const uploadedFileName = useMemo(() => {
    const selected = sources.filter(s => s.selected)
    if (selected.length === 0) return null
    if (selected.length === 1) return selected[0].name
    return `${selected[0].name} +${selected.length - 1} ไฟล์`
  }, [sources])

  const setGameQuestions = useCallback((gameType: string, q: QuizQuestion[]) => {
    const first = sources.find(s => s.selected && s.status === "ready")
    if (first) {
      updateSource(first.id, { gameQuestions: { ...first.gameQuestions, [gameType]: q } })
    }
  }, [sources, updateSource])

  return (
    <QuestionsContext.Provider value={{
      sources,
      addSource,
      updateSource,
      removeSource,
      toggleSource,
      toggleAll,
      questions,
      gameQuestions,
      hasQuestions: questions.length > 0,
      uploadedText,
      summary,
      isGenerating,
      setGameQuestions,
      uploadedFileName,
    }}>
      {children}
    </QuestionsContext.Provider>
  )
}

export const useQuestions = () => useContext(QuestionsContext)

/* Demo questions — fallback when no sources loaded */
export const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "อนุพันธ์ของ sin(x) คืออะไร?",
    choices: ["cos(x)", "-cos(x)", "tan(x)", "-sin(x)"],
    correct: 0,
    explanation: "อนุพันธ์ของ sin(x) คือ cos(x) ซึ่งเป็นกฎพื้นฐานของแคลคูลัส",
  },
  {
    id: 2,
    question: "โครงสร้างข้อมูลใดทำงานแบบ FIFO?",
    choices: ["Stack", "Queue", "Tree", "Graph"],
    correct: 1,
    explanation: "Queue ทำงานแบบ First-In-First-Out คือสิ่งที่เข้าก่อนจะออกก่อน",
  },
  {
    id: 3,
    question: "กฎข้อที่สองของนิวตันกล่าวว่าอะไร?",
    choices: ["F = ma", "E = mc²", "V = IR", "P = mv"],
    correct: 0,
    explanation: "แรง = มวล × ความเร่ง (F = ma) คือกฎข้อที่สองของนิวตัน",
  },
  {
    id: 4,
    question: "ความซับซ้อนของ Binary Search คือ?",
    choices: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correct: 1,
    explanation: "Binary Search แบ่งครึ่งพื้นที่ค้นหาทุกขั้น จึงได้ O(log n)",
  },
  {
    id: 5,
    question: "∫ 1/x dx เท่ากับอะไร?",
    choices: ["ln|x| + C", "x² + C", "e^x + C", "1/x² + C"],
    correct: 0,
    explanation: "อินทิกรัลของ 1/x คือ ln|x| + C",
  },
]
