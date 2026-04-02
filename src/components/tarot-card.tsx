"use client"

import { TarotCard, getCardColor, getCardImageUrl } from "@/lib/tarot-data"

interface TarotCardProps {
  card: TarotCard
  reversed?: boolean
  revealed?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: { w: 120, h: 200, scale: 120 / 160 },
  md: { w: 160, h: 270, scale: 1 },
  lg: { w: 200, h: 340, scale: 200 / 160 },
}


export function TarotCardDisplay({
  card,
  reversed = false,
  revealed = false,
  onClick,
  size = 'md',
}: TarotCardProps) {
  const { w, h, scale } = SIZE_MAP[size]
  const color = getCardColor(card.suit)
  const imageUrl = getCardImageUrl(card)

  return (
    <div
      onClick={onClick}
      style={{
        width: w,
        height: h,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      {/* Front face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: revealed ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: revealed ? 'auto' : 'none',
          borderRadius: 8,
          overflow: 'hidden',
          border: `2px solid ${color.accent}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={card.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transform: reversed ? 'rotate(180deg)' : undefined,
          }}
        />
        {/* Name overlay at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
            padding: `${18 * scale}px 6px ${6 * scale}px`,
            textAlign: 'center',
          }}
        >
          <div style={{ color: color.accent, fontSize: 11 * scale, fontWeight: 'bold', lineHeight: 1.2 }}>
            {card.nameTH}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 7.5 * scale, fontFamily: 'serif', letterSpacing: 1, marginTop: 1 }}>
            {card.name}
          </div>
        </div>
      </div>

      {/* Back face */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: revealed ? 0 : 1,
          transition: 'opacity 0.4s ease',
          pointerEvents: revealed ? 'none' : 'auto',
        }}
      >
          <svg
            viewBox="0 0 160 270"
            width={w}
            height={h}
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            {/* Background */}
            <rect x="0" y="0" width="160" height="270" rx="8" fill="#1a3d19" />

            {/* Gold border */}
            <rect
              x="4" y="4" width="152" height="262"
              rx="6" fill="none"
              stroke="#C9A227" strokeWidth="2"
            />

            {/* Inner decorative border */}
            <rect
              x="8" y="8" width="144" height="254"
              rx="4" fill="none"
              stroke="#C9A227" strokeWidth="0.5" opacity="0.4"
            />

            {/* Corner decorations */}
            <text x="14" y="20" fontSize="8" fill="#C9A227" textAnchor="middle">✦</text>
            <text x="146" y="20" fontSize="8" fill="#C9A227" textAnchor="middle">✦</text>
            <text x="14" y="262" fontSize="8" fill="#C9A227" textAnchor="middle">✦</text>
            <text x="146" y="262" fontSize="8" fill="#C9A227" textAnchor="middle">✦</text>

            {/* Diagonal grid pattern */}
            <g opacity="0.12" stroke="#C9A227" strokeWidth="0.6">
              {Array.from({ length: 14 }).map((_, i) => (
                <line
                  key={`d1-${i}`}
                  x1={i * 24 - 100}
                  y1="0"
                  x2={i * 24 + 70}
                  y2="270"
                />
              ))}
              {Array.from({ length: 14 }).map((_, i) => (
                <line
                  key={`d2-${i}`}
                  x1={i * 24 + 70}
                  y1="0"
                  x2={i * 24 - 100}
                  y2="270"
                />
              ))}
            </g>

            {/* KU monogram */}
            <text
              x="80" y="130"
              fontSize="56"
              fontWeight="bold"
              fill="#C9A227"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="serif"
              opacity="0.9"
            >
              KU
            </text>

            {/* Decorative lines around monogram */}
            <line x1="24" y1="105" x2="54" y2="105" stroke="#C9A227" strokeWidth="0.8" opacity="0.6" />
            <line x1="106" y1="105" x2="136" y2="105" stroke="#C9A227" strokeWidth="0.8" opacity="0.6" />
            <line x1="24" y1="155" x2="54" y2="155" stroke="#C9A227" strokeWidth="0.8" opacity="0.6" />
            <line x1="106" y1="155" x2="136" y2="155" stroke="#C9A227" strokeWidth="0.8" opacity="0.6" />

            {/* Ornament above monogram */}
            <g transform="translate(80, 78)" opacity="0.75">
              <polygon points="0,-9 2.5,-3 9,-3 4,1.5 6,8 0,4 -6,8 -4,1.5 -9,-3 -2.5,-3"
                fill="#C9A227" />
            </g>

            {/* Bottom text */}
            <text
              x="80" y="250"
              fontSize="7.5"
              fill="#C9A227"
              textAnchor="middle"
              letterSpacing="1"
              opacity="0.8"
            >
              KU Prep Arena
            </text>
          </svg>
      </div>
    </div>
  )
}
