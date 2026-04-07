"use client"

import { useState, useMemo, useEffect } from "react"
import { getDailyCards, TarotCard, getCardColor, getCardImageUrl } from "@/lib/tarot-data"
import { TarotCardDisplay } from "@/components/tarot-card"

type CardEntry = TarotCard & { reversed: boolean }

const SPREAD = [
  { label: 'ภาพรวมวันนี้',  icon: '⭐', key: 'daily'   as const, hue: '#C9A227' },
  { label: 'การเรียน & สอบ', icon: '📚', key: 'study'   as const, hue: '#64B5F6' },
  { label: 'การเงิน',        icon: '💰', key: 'finance' as const, hue: '#81C784' },
]

const STARS = Array.from({ length: 20 }, (_, i) => ({
  size: 1 + ((i * 13) % 4) * 0.5,
  top:  `${((i * 137.508) % 100).toFixed(1)}%`,
  left: `${((i * 73.137 + 11) % 100).toFixed(1)}%`,
  delay:`${((i * 0.41) % 3).toFixed(1)}s`,
  dur:  `${2.5 + ((i * 0.73) % 2).toFixed(1)}s`,
  op:   parseFloat((0.07 + ((i * 0.11) % 0.2)).toFixed(2)),
}))

function getMeaning(card: CardEntry, key: 'daily' | 'study' | 'finance') {
  if (card.reversed) {
    const rk = `reversed${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof TarotCard
    return card[rk] as string
  }
  return card[key]
}

async function fetchAIFortune(card: CardEntry, spreadLabel: string, todayStr: string): Promise<string> {
  const cacheKey = `ku-fortune-${todayStr}-${card.id}-${card.reversed}-${spreadLabel}`
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) return cached
  } catch { /* ignore */ }

  const prompt = `ไพ่ ${card.nameTH} (${card.name})${card.reversed ? ' กลับหัว' : ''} โหมด ${spreadLabel} — ขอคำทำนายสั้นๆ 2-3 ประโยค สำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์ ตอบเป็นภาษาไทยเท่านั้น ไม่ต้องมี prefix`

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
  })

  if (!res.ok || !res.body) throw new Error("AI unavailable")

  // Read streaming response
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
  }

  const result = text.trim()
  try { sessionStorage.setItem(cacheKey, result) } catch { /* ignore */ }
  return result
}

export function DailyFortuneContent() {
  const today    = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today])
  const raw      = useMemo(() => getDailyCards(todayStr), [todayStr])
  const cards    = useMemo<CardEntry[]>(() => [
    { ...raw.overall.card, reversed: raw.overall.reversed },
    { ...raw.study.card,   reversed: raw.study.reversed   },
    { ...raw.finance.card, reversed: raw.finance.reversed },
  ], [raw])

  const [revealed, setRevealed] = useState([false, false, false])
  const [selected, setSelected] = useState<number | null>(null)
  // AI fortune texts — null = loading, "" = failed/fallback
  const [aiTexts, setAiTexts] = useState<(string | null)[]>([null, null, null])

  // Prefetch all 3 AI fortunes in parallel on mount
  useEffect(() => {
    Promise.all(
      cards.map((card, i) =>
        fetchAIFortune(card, SPREAD[i].label, todayStr).catch(() => "")
      )
    ).then(results => setAiTexts(results))
  }, [cards, todayStr])

  function revealCard(i: number) {
    setRevealed(p => { const n = [...p]; n[i] = true; return n })
    setSelected(i)
  }
  function revealAll() {
    setRevealed([true, true, true])
    if (selected === null) setSelected(0)
  }
  function handleClick(i: number) {
    if (!revealed[i]) revealCard(i)
    else setSelected(selected === i ? null : i)
  }

  const selCard  = selected !== null ? cards[selected] : null
  const selColor = selCard ? getCardColor(selCard.suit) : null
  const spread   = selected !== null ? SPREAD[selected] : null
  const allOpen  = revealed.every(Boolean)

  // Determine fortune text: AI if available, static fallback
  const fortuneText = (selected !== null && selCard && spread)
    ? (aiTexts[selected] || getMeaning(selCard, spread.key))
    : null
  const isLoadingAI = selected !== null && aiTexts[selected] === null

  return (
    <div className="h-full flex flex-col lg:flex-row gap-0 overflow-hidden">

      {/* Stars */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {STARS.map((s, i) => (
          <span key={i} className="absolute rounded-full bg-[#C9A227] animate-pulse"
            style={{ width: s.size, height: s.size, top: s.top, left: s.left,
              animationDelay: s.delay, animationDuration: s.dur, opacity: s.op }} />
        ))}
      </div>

      {/* ── Left / top: Cards ── */}
      <div className="relative z-10 shrink-0 flex flex-col items-center justify-start
        px-6 pt-8 pb-4 lg:w-72 lg:border-r lg:border-border lg:pt-10 lg:pb-8 lg:overflow-y-auto">

        {/* Date header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold text-muted-foreground/60 tracking-widest uppercase">
            {today.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 className="text-base font-bold text-foreground/80 mt-0.5">ดวงประจำวัน</h2>
        </div>

        {/* Cards */}
        <div className="flex lg:flex-col gap-4 lg:gap-5 items-start justify-center">
          {cards.map((card, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              {/* Label */}
              <button
                onClick={() => revealed[i] && setSelected(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all
                  ${revealed[i] ? 'cursor-pointer' : 'cursor-default'}
                  ${selected === i && revealed[i]
                    ? 'ring-1 ring-offset-1'
                    : 'opacity-70 hover:opacity-100'}`}
                style={selected === i && revealed[i]
                  ? { color: SPREAD[i].hue, background: `${SPREAD[i].hue}18`, ringColor: SPREAD[i].hue }
                  : { color: SPREAD[i].hue }}>
                {SPREAD[i].icon} {SPREAD[i].label}
              </button>

              {/* Card */}
              <div
                onClick={() => handleClick(i)}
                className={`cursor-pointer transition-all duration-200 ${selected === i && revealed[i] ? 'scale-105' : 'hover:scale-[1.02]'}`}
                style={selected === i && revealed[i]
                  ? { filter: `drop-shadow(0 0 14px ${SPREAD[i].hue}60)` }
                  : undefined}>
                <TarotCardDisplay card={card} reversed={card.reversed} revealed={revealed[i]} size="sm" />
              </div>

              {/* Status */}
              {revealed[i] && card.reversed
                ? <span className="text-[9px] bg-amber-900/40 text-amber-300 border border-amber-700/30 rounded-full px-2 py-0.5">กลับหัว</span>
                : !revealed[i]
                  ? <span className="text-[10px] text-muted-foreground/40 animate-pulse">แตะเพื่อเปิด</span>
                  : null}
            </div>
          ))}
        </div>

        {/* Reveal all */}
        {!allOpen && (
          <button onClick={revealAll}
            className="mt-6 flex items-center gap-2 px-5 py-2 rounded-full text-[#C9A227] text-xs font-semibold
              border border-[#C9A227]/30 bg-[#C9A227]/8 hover:bg-[#C9A227]/15 active:scale-[0.98] transition-all">
            ✨ เปิดทั้งหมด
          </button>
        )}
      </div>

      {/* ── Right / bottom: Reading panel ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        {!selCard || !spread ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-3xl border border-[#C9A227]/20 bg-[#C9A227]/5
              flex items-center justify-center text-3xl">🔮</div>
            <div>
              <p className="text-base font-semibold text-foreground/70">เลือกไพ่เพื่อดูนิมิต</p>
              <p className="text-sm text-muted-foreground/50 mt-1">แตะไพ่ใบใดใบหนึ่งเพื่ออ่านความหมาย</p>
            </div>
          </div>
        ) : (
          <div className="max-w-xl">
            {/* Top accent */}
            <div className="h-0.5 rounded-full mb-6"
              style={{ background: `linear-gradient(90deg, ${spread.hue}, ${spread.hue}30, transparent)` }} />

            {/* Card + topic header */}
            <div className="flex items-center gap-5 mb-6">
              {/* Card thumbnail */}
              <div className="shrink-0 rounded-xl overflow-hidden shadow-lg"
                style={{
                  width: 64, height: 107,
                  border: `2px solid ${selColor?.accent ?? '#C9A227'}40`,
                  boxShadow: `0 4px 20px ${selColor?.accent ?? '#C9A227'}22`,
                }}>
                <img
                  src={getCardImageUrl(selCard)}
                  alt={selCard.name}
                  className="w-full h-full object-cover"
                  style={{ transform: selCard.reversed ? 'rotate(180deg)' : undefined }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-2 text-xs font-bold uppercase tracking-widest"
                  style={{ color: spread.hue, background: `${spread.hue}18`, border: `1px solid ${spread.hue}30` }}>
                  {spread.icon} {spread.label}
                </div>
                <h2 className="text-2xl font-black text-foreground leading-tight">
                  {selCard.nameTH}
                  {selCard.reversed && <span className="text-sm font-normal text-amber-400/70 ml-2">↓ กลับหัว</span>}
                </h2>
                <p className="text-xs text-muted-foreground/50 tracking-wider mt-0.5">{selCard.name}</p>
              </div>
            </div>

            {/* Fortune text */}
            <div className="rounded-2xl p-6 min-h-[80px]"
              style={{ background: `${spread.hue}0d`, border: `1px solid ${spread.hue}28` }}>
              {isLoadingAI ? (
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s`, color: spread.hue }} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground/60">กำลังเรียกนิมิต...</p>
                </div>
              ) : (
                <p className="text-base leading-8 text-foreground/90 font-medium">
                  {fortuneText}
                </p>
              )}
            </div>

            {/* Other cards quick nav */}
            {allOpen && (
              <div className="flex gap-2 mt-5">
                {SPREAD.map((s, i) => (
                  <button key={i}
                    onClick={() => setSelected(i)}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all text-center"
                    style={selected === i
                      ? { background: `${s.hue}20`, color: s.hue, border: `1px solid ${s.hue}40` }
                      : { background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            )}

            <p className="text-muted-foreground/30 text-[10px] mt-6 tracking-wider">
              ไพ่เปลี่ยนทุกวัน · ผลเดิมในวันเดียวกัน · ✨ AI-powered
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
