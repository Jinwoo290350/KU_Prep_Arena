"use client"

import { QuestionsProvider } from "@/lib/questions-context"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return <QuestionsProvider>{children}</QuestionsProvider>
}
