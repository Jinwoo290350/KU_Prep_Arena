"use client"

import Link from "next/link"
import { useQuestions } from "@/lib/questions-context"
import { Star, Play } from "lucide-react"

const games = [
  {
    id: "flappy",
    emoji: "🐦",
    title: "Flappy Kaset Bird",
    description: "Steer the owl up/down to collect the correct answer bubble. Dodge pipes!",
    href: "/arena/flappy",
    accent: "#336600",
    accentLight: "rgba(51,102,0,0.12)",
  },
  {
    id: "racer",
    emoji: "🏎️",
    title: "KU Speed Racer",
    description: "Switch into the correct answer lane before you reach the billboard.",
    href: "/arena/racer",
    accent: "#d4a800",
    accentLight: "rgba(212,168,0,0.12)",
  },
  {
    id: "shooter",
    emoji: "🚀",
    title: "KU Space Shooter",
    description: "Shoot only the asteroid labeled with the correct answer. 3 lives!",
    href: "/arena/shooter",
    accent: "#2d8a18",
    accentLight: "rgba(45,138,24,0.12)",
  },
  {
    id: "snake",
    emoji: "🐍",
    title: "KU Snake Quiz",
    description: "Guide the snake to eat the correct lettered food on the grid.",
    href: "/arena/snake",
    accent: "#236b12",
    accentLight: "rgba(35,107,18,0.12)",
  },
  {
    id: "bricks",
    emoji: "🧱",
    title: "KU Brick Breaker",
    description: "Bounce the ball to smash only the brick with the correct answer.",
    href: "/arena/bricks",
    accent: "#4a8c1c",
    accentLight: "rgba(74,140,28,0.12)",
  },
]

function NoMaterialBanner() {
  return (
    <div className="glass-card rounded-xl p-5 border border-dashed border-border text-center">
      <div className="text-3xl mb-2 float-anim inline-block">📤</div>
      <p className="text-sm font-semibold text-foreground mb-1">Upload study material first</p>
      <p className="text-xs text-muted-foreground">
        Use the <span className="font-semibold text-foreground">Upload Material</span> button in the sidebar to generate questions for all 5 games.
      </p>
    </div>
  )
}

function MaterialBanner() {
  const { questions, uploadedFileName } = useQuestions()
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border border-ku-green-500/30 bg-ku-green-500/10 dark:bg-ku-green-900/40">
      <span className="text-xl">📄</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {uploadedFileName || "Study material loaded"}
        </p>
        <p className="text-xs text-muted-foreground">
          {questions.length} questions ready — pick a game and start!
        </p>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">Use sidebar to replace</span>
    </div>
  )
}

function GameCard({ game }: { game: typeof games[0] }) {
  const { hasQuestions } = useQuestions()

  return (
    <div
      className="glass-card rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-lg group"
      style={{ borderLeft: `4px solid ${game.accent}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shrink-0 group-hover:scale-110 transition-transform duration-200"
          style={{ background: game.accentLight }}
        >
          {game.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">{game.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{game.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Star className="h-3 w-3 text-ku-gold" />
        <span>Best: <span className="text-foreground font-semibold">—</span></span>
      </div>

      <Link
        href={hasQuestions ? game.href : "#"}
        onClick={(e) => { if (!hasQuestions) e.preventDefault() }}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold
          transition-all duration-200 min-h-11"
        style={hasQuestions
          ? { background: game.accent, color: "#fff" }
          : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)", cursor: "not-allowed" }
        }
        aria-disabled={!hasQuestions}
      >
        <Play className="h-4 w-4" />
        {hasQuestions ? "Play" : "Upload material first"}
      </Link>
    </div>
  )
}

export function GameHubContent() {
  const { hasQuestions } = useQuestions()

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ku-green-500 mb-4 arena-glow-anim">
          <span className="text-3xl">🏟️</span>
        </div>
        <h1 className="text-3xl font-black text-foreground glow-title mb-2 tracking-tight">
          KU Arena
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          5 quiz-powered mini-games built for Kasetsart University students.
          Upload your study material — every game transforms into your personal tutor.
        </p>
      </div>

      {/* Material status */}
      {hasQuestions ? <MaterialBanner /> : <NoMaterialBanner />}

      {/* Game cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      {/* How it works */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { step: "1", emoji: "📤", label: "Upload PDF or TXT", desc: "Lecture notes, textbooks, or any study material" },
            { step: "2", emoji: "🤖", label: "AI generates questions", desc: "Key concepts extracted → multiple-choice questions" },
            { step: "3", emoji: "🎮", label: "Play & learn", desc: "Answer questions through 5 different game mechanics" },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ku-green-500 text-white text-sm font-bold">
                {item.step}
              </div>
              <div className="text-2xl">{item.emoji}</div>
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
