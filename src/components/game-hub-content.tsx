"use client"

import Link from "next/link"
import { useQuestions } from "@/lib/questions-context"
import { useScores } from "@/lib/use-scores"

/* ── Mini game preview animations ── */
const previewStyles = `
@keyframes bird-fly {
  0%,100% { transform: translateY(0px) rotate(-8deg); }
  50% { transform: translateY(-14px) rotate(4deg); }
}
@keyframes pipe-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-60px); }
}
@keyframes car-zoom {
  0% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  100% { transform: translateX(-8px); }
}
@keyframes lane-scroll {
  0% { transform: translateY(0); }
  100% { transform: translateY(24px); }
}
@keyframes rocket-hover {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes asteroid-fall {
  0% { transform: translateY(0px) rotate(0deg); opacity:1; }
  100% { transform: translateY(60px) rotate(180deg); opacity:0.3; }
}
@keyframes star-twinkle {
  0%,100% { opacity:0.2; } 50% { opacity:0.8; }
}
@keyframes snake-move {
  0% { transform: translateX(0); }
  25% { transform: translateX(12px); }
  50% { transform: translateX(12px) translateY(-12px); }
  75% { transform: translateX(0) translateY(-12px); }
  100% { transform: translateX(0); }
}
@keyframes ball-bounce {
  0%,100% { transform: translate(0px, 0px); }
  25% { transform: translate(18px, -30px); }
  50% { transform: translate(36px, -8px); }
  75% { transform: translate(18px, -38px); }
}
@keyframes brick-flash {
  0%,90%,100% { opacity:1; } 92%,98% { opacity:0; }
}
`

function FlappyPreview() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#87CEEB]/20 to-[#228B22]/20 rounded-t-xl">
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-[#336600]/40 rounded-b" />
      {/* Pipes */}
      {[0, 1].map(p => (
        <div key={p} className="absolute top-0 bottom-3"
          style={{ left: `${35 + p * 55}%`, animation: `pipe-scroll 1.8s linear infinite`, animationDelay: `${p * -0.9}s` }}>
          <div className="w-6 bg-[#336600]/60 rounded-b h-14 absolute top-0" />
          <div className="w-6 bg-[#336600]/60 rounded-t h-10 absolute bottom-3" />
        </div>
      ))}
      {/* Bird */}
      <div className="absolute text-xl" style={{ top: '35%', left: '20%', animation: 'bird-fly 0.9s ease-in-out infinite' }}>
        🐦
      </div>
      {/* Answer bubble */}
      <div className="absolute text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#C9A227]/80 text-white"
        style={{ top: '20%', left: '55%', animation: 'bird-fly 1.4s ease-in-out infinite', animationDelay: '-0.3s' }}>
        A
      </div>
    </div>
  )
}

function RacerPreview() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#111]/60 to-[#1a1a1a]/60 rounded-t-xl">
      {/* Road */}
      <div className="absolute inset-x-4 top-0 bottom-0 bg-[#2a2a2a]/60 rounded" />
      {/* Lane dashes */}
      {[0,1,2,3,4].map(i => (
        <div key={i} className="absolute w-0.5 h-4 bg-[#C9A227]/40 left-1/2 -translate-x-1/2 rounded"
          style={{ top: `${i * 20}%`, animation: 'lane-scroll 0.6s linear infinite', animationDelay: `${i * -0.12}s` }} />
      ))}
      {/* Answer labels */}
      {['A','B','C'].map((l,i) => (
        <div key={l} className="absolute text-[9px] font-black text-white/60 bg-white/10 rounded px-1"
          style={{ bottom: '22%', left: `${18 + i * 30}%` }}>{l}</div>
      ))}
      {/* Car */}
      <div className="absolute text-2xl" style={{ bottom: '8%', left: '50%', transform: 'translateX(-50%)', animation: 'car-zoom 2s ease-in-out infinite' }}>
        🏎️
      </div>
    </div>
  )
}

function ShooterPreview() {
  const stars = [14,30,52,70,85,22,63,41,78,8]
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#050a1a]/80 to-[#0a1530]/80 rounded-t-xl">
      {/* Stars */}
      {stars.map((x, i) => (
        <div key={i} className="absolute w-0.5 h-0.5 rounded-full bg-white"
          style={{ left: `${x}%`, top: `${(i * 37) % 80}%`, animation: `star-twinkle ${1+i*0.3}s ease-in-out infinite`, animationDelay: `${i*0.2}s` }} />
      ))}
      {/* Asteroids */}
      {[25,60,78].map((x,i) => (
        <div key={i} className="absolute text-base"
          style={{ left:`${x}%`, top:'5%', animation:`asteroid-fall ${1.5+i*0.4}s ease-in infinite`, animationDelay:`${i*-0.6}s` }}>
          🪨
        </div>
      ))}
      {/* Laser */}
      <div className="absolute w-0.5 h-5 bg-[#4ade80]/70 rounded"
        style={{ bottom: '18%', left: '50%', boxShadow: '0 0 4px #4ade80' }} />
      {/* Rocket */}
      <div className="absolute text-xl" style={{ bottom: '4%', left: '50%', transform: 'translateX(-50%)', animation: 'rocket-hover 1.2s ease-in-out infinite' }}>
        🚀
      </div>
    </div>
  )
}

function SnakePreview() {
  // 4×4 grid with animated snake
  const grid = Array.from({ length: 16 }, (_, i) => i)
  const snakeCells = [5, 6, 7, 11]
  const foodCell = 14
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0d1a0d]/80 rounded-t-xl flex items-center justify-center">
      <div className="grid grid-cols-4 gap-0.5 p-2" style={{ width: 72, height: 72 }}>
        {grid.map(i => (
          <div key={i} className="rounded-sm w-full aspect-square flex items-center justify-center"
            style={{
              background: snakeCells.includes(i) ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.04)',
              fontSize: 8,
            }}>
            {i === foodCell && <span>🍎</span>}
            {i === snakeCells[0] && <span style={{ fontSize: 7 }}>👀</span>}
          </div>
        ))}
      </div>
      {/* Answer labels floating */}
      {['A','B','C','D'].map((l,i) => (
        <div key={l} className="absolute text-[8px] font-black"
          style={{ color: '#4ade80', opacity: 0.5,
            left: `${10+i*24}%`, bottom: '6%' }}>{l}</div>
      ))}
    </div>
  )
}

function BricksPreview() {
  const brickColors = ['#C9A227','#336600','#4a8c1c','#C9A227','#336600','#4a8c1c']
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#0a0f0a]/80 to-[#0d1a0d]/80 rounded-t-xl">
      {/* Bricks — 3 rows × 4 cols */}
      {[0,1,2].map(row => (
        <div key={row} className="absolute flex gap-1 left-2 right-2"
          style={{ top: `${8 + row * 18}%` }}>
          {[0,1,2,3].map(col => (
            <div key={col} className="flex-1 h-3 rounded-sm flex items-center justify-center text-[8px] font-black text-white/90"
              style={{
                background: `${brickColors[(row+col)%6]}90`,
                animation: row === 1 && col === 2 ? 'brick-flash 2s ease-in-out infinite' : undefined,
              }}>
              {col === 2 && row === 0 ? 'A' : col === 0 && row === 1 ? 'B' : col === 3 && row === 2 ? 'C' : ''}
            </div>
          ))}
        </div>
      ))}
      {/* Paddle */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-1.5 w-10 rounded-full bg-[#C9A227]/70" />
      {/* Ball */}
      <div className="absolute w-2 h-2 rounded-full bg-white/80"
        style={{ bottom: '18%', left: '30%', boxShadow: '0 0 4px rgba(255,255,255,0.5)', animation: 'ball-bounce 1.6s ease-in-out infinite' }} />
    </div>
  )
}

const GAMES = [
  {
    id: 'flappy',   href: '/arena/flappy',
    emoji: '🐦',   title: 'Flappy Kaset',  subtitle: 'Bird',
    tag: 'DODGE',
    accent: '#4ade80', gold: '#C9A227',
    Preview: FlappyPreview,
  },
  {
    id: 'racer',    href: '/arena/racer',
    emoji: '🏎️',  title: 'Speed',         subtitle: 'Racer',
    tag: 'SPEED',
    accent: '#C9A227', gold: '#C9A227',
    Preview: RacerPreview,
  },
  {
    id: 'shooter',  href: '/arena/shooter',
    emoji: '🚀',   title: 'Space',         subtitle: 'Shooter',
    tag: 'SHOOT',
    accent: '#4ade80', gold: '#C9A227',
    Preview: ShooterPreview,
  },
  {
    id: 'snake',    href: '/arena/snake',
    emoji: '🐍',   title: 'Snake',         subtitle: 'Quiz',
    tag: 'CLASSIC',
    accent: '#86efac', gold: '#C9A227',
    Preview: SnakePreview,
  },
  {
    id: 'bricks',   href: '/arena/bricks',
    emoji: '🧱',   title: 'Brick',         subtitle: 'Breaker',
    tag: 'ARCADE',
    accent: '#C9A227', gold: '#C9A227',
    Preview: BricksPreview,
  },
]

function GameCard({ game }: { game: typeof GAMES[0] }) {
  const { hasQuestions } = useQuestions()
  const { bestScores } = useScores()
  const best = bestScores[game.id]
  const locked = !hasQuestions
  const { Preview } = game

  return (
    <Link
      href={locked ? '#' : game.href}
      onClick={e => { if (locked) e.preventDefault() }}
      aria-disabled={locked}
      className={`group flex flex-col rounded-2xl overflow-hidden border bg-card transition-all duration-300
        border-border/60
        ${locked ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-2 cursor-pointer hover:border-(--game-accent)/50'}`}
      style={{ ['--game-accent' as string]: game.accent } as React.CSSProperties}
      onMouseEnter={e => {
        if (locked) return;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${game.accent}22, 0 4px 16px ${game.accent}14`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = ''
      }}
    >
      {/* Mini game preview — always dark (game screen) */}
      <div className="relative h-40 shrink-0 rounded-t-2xl overflow-hidden">
        <Preview />
        {/* Tag */}
        <div className="absolute top-2 left-2 text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: game.accent, background: 'rgba(0,0,0,0.55)', border: `1px solid ${game.accent}40` }}>
          {game.tag}
        </div>
        {/* Best score */}
        {best !== undefined && (
          <div className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded"
            style={{ color: '#C9A227', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(201,162,39,0.35)' }}>
            ★ {best}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${game.accent}50, transparent)` }} />

      {/* Card info — theme-aware */}
      <div className="flex-1 p-5 flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <span className="text-5xl leading-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
            {game.emoji}
          </span>
          <div className="leading-tight">
            <p className="text-base font-black text-foreground">{game.title}</p>
            <p className="text-base font-black" style={{ color: game.accent }}>{game.subtitle}</p>
          </div>
        </div>

        {/* Play button */}
        <div className="mt-auto">
          {locked ? (
            <div className="text-center py-2.5 rounded-xl text-xs font-semibold text-muted-foreground/50 border border-border/40">
              Upload first
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all duration-200"
              style={{ background: `linear-gradient(135deg, #336600, ${game.accent}cc)`, color: '#fff' }}>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"
                className="transition-transform duration-200 group-hover:translate-x-0.5">
                <polygon points="0,0 10,6 0,12" />
              </svg>
              PLAY
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export function GameHubContent() {
  const { hasQuestions, questions, uploadedFileName } = useQuestions()

  return (
    <>
      <style>{previewStyles}</style>
      <div className="flex flex-col gap-5">
        {/* Material status */}
        {hasQuestions ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-ku-green-500/30 bg-ku-green-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-ku-green-400 animate-pulse shrink-0" />
            <p className="text-sm text-ku-green-700 dark:text-ku-green-200 truncate flex-1">
              <span className="font-bold">{uploadedFileName || 'Study material'}</span>
              {' '}— {questions.length} questions ready
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-muted/40">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
            <p className="text-sm text-muted-foreground">Upload study material from the sidebar to unlock all games.</p>
          </div>
        )}

        {/* Game grid — 2 col mobile, 3 col md, 5 col xl */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {GAMES.map(game => <GameCard key={game.id} game={game} />)}
        </div>
      </div>
    </>
  )
}
