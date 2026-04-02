"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { QuizQuestion } from "./mock-data"

interface QuestionsContextType {
  questions: QuizQuestion[]
  setQuestions: (q: QuizQuestion[]) => void
  hasQuestions: boolean
  uploadedFileName: string | null
  setUploadedFileName: (name: string | null) => void
  uploadedText: string | null
  setUploadedText: (text: string | null) => void
  summary: string[]
  setSummary: (s: string[]) => void
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
  /** Per-game question sets — populated on initial upload */
  gameQuestions: Partial<Record<string, QuizQuestion[]>>
  setGameQuestions: (gameType: string, q: QuizQuestion[]) => void
}

const QuestionsContext = createContext<QuestionsContextType>({
  questions: [],
  setQuestions: () => {},
  hasQuestions: false,
  uploadedFileName: null,
  setUploadedFileName: () => {},
  uploadedText: null,
  setUploadedText: () => {},
  summary: [],
  setSummary: () => {},
  isGenerating: false,
  setIsGenerating: () => {},
  gameQuestions: {},
  setGameQuestions: () => {},
})

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedText, setUploadedText] = useState<string | null>(null)
  const [summary, setSummary] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [gameQuestions, setGameQuestionsMap] = useState<Partial<Record<string, QuizQuestion[]>>>({})

  function setGameQuestions(gameType: string, q: QuizQuestion[]) {
    setGameQuestionsMap((prev) => ({ ...prev, [gameType]: q }))
  }

  return (
    <QuestionsContext.Provider
      value={{
        questions,
        setQuestions,
        hasQuestions: questions.length > 0,
        uploadedFileName,
        setUploadedFileName,
        uploadedText,
        setUploadedText,
        summary,
        setSummary,
        isGenerating,
        setIsGenerating,
        gameQuestions,
        setGameQuestions,
      }}
    >
      {children}
    </QuestionsContext.Provider>
  )
}

export const useQuestions = () => useContext(QuestionsContext)

/* Demo questions — fallback when AI API is not configured */
export const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the derivative of sin(x)?",
    choices: ["cos(x)", "-cos(x)", "tan(x)", "-sin(x)"],
    correct: 0,
    explanation: "The derivative of sin(x) is cos(x). This is a fundamental calculus rule.",
  },
  {
    id: 2,
    question: "Which data structure follows FIFO order?",
    choices: ["Stack", "Queue", "Tree", "Graph"],
    correct: 1,
    explanation: "A Queue follows First-In-First-Out: the first element inserted is the first removed.",
  },
  {
    id: 3,
    question: "Newton's Second Law of Motion states:",
    choices: ["F = ma", "E = mc²", "V = IR", "P = mv"],
    correct: 0,
    explanation: "Force equals mass times acceleration (F = ma) — Newton's Second Law.",
  },
  {
    id: 4,
    question: "What is the time complexity of binary search?",
    choices: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correct: 1,
    explanation: "Binary search halves the search space each step, giving O(log n) complexity.",
  },
  {
    id: 5,
    question: "Which integral gives ln|x| + C?",
    choices: ["∫ 1/x dx", "∫ x dx", "∫ e^x dx", "∫ ln(x) dx"],
    correct: 0,
    explanation: "The integral of 1/x is ln|x| + C — a standard calculus result.",
  },
  {
    id: 6,
    question: "What is the Big O of Bubble Sort?",
    choices: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correct: 2,
    explanation: "Bubble sort compares each pair repeatedly, resulting in O(n²) time complexity.",
  },
  {
    id: 7,
    question: "The SI unit of force is:",
    choices: ["Joule", "Newton", "Watt", "Pascal"],
    correct: 1,
    explanation: "The Newton (N) is the SI unit of force, defined as kg·m/s².",
  },
  {
    id: 8,
    question: "Which is a self-balancing binary search tree?",
    choices: ["AVL Tree", "Linked List", "Hash Table", "Array"],
    correct: 0,
    explanation: "AVL Tree maintains balance by ensuring heights of subtrees differ by at most 1.",
  },
  {
    id: 9,
    question: "The Pythagorean theorem states:",
    choices: ["a²+b²=c²", "a+b=c", "a³+b³=c³", "2a+2b=c"],
    correct: 0,
    explanation: "For a right triangle: the square of hypotenuse equals sum of squares of the other sides.",
  },
  {
    id: 10,
    question: "Which sorting algorithm is stable?",
    choices: ["Quick Sort", "Heap Sort", "Merge Sort", "Selection Sort"],
    correct: 2,
    explanation: "Merge Sort preserves the relative order of equal elements, making it stable.",
  },
  {
    id: 11,
    question: "What does DNA stand for?",
    choices: ["Deoxyribonucleic Acid", "Dinitrogen Acid", "Dynamic Nucleic Array", "Dual Nitrogen Atom"],
    correct: 0,
    explanation: "DNA = Deoxyribonucleic Acid, the molecule that carries genetic information.",
  },
  {
    id: 12,
    question: "The integral of e^x dx is:",
    choices: ["e^x + C", "x·e^x + C", "ln(x) + C", "1/e^x + C"],
    correct: 0,
    explanation: "The integral of e^x is itself plus a constant: e^x + C.",
  },
]
