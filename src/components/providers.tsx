"use client"

import { SessionProvider } from "next-auth/react"
import { QuestionsProvider } from "@/lib/questions-context"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QuestionsProvider>{children}</QuestionsProvider>
    </SessionProvider>
  )
}
