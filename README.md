<div align="center">

# KU Prep Arena

**เปลี่ยนการทบทวนบทเรียนให้เป็นเกม — แข่งกับเพื่อนแบบ real-time**

อัปโหลดเอกสาร → AI สร้างข้อสอบอัตโนมัติ → เล่น 5 มินิเกม หรือแข่ง multiplayer

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com)
[![PartyKit](https://img.shields.io/badge/PartyKit-WebSocket-ff6b35)](https://partykit.io)

</div>

---

## ทีม

> **KU AI Pioneers: Forward Challenge** — Theme: "AI for Gen Z Lifestyle @KU"  
> Team: **dek vid sigma skibidi rizz**

| ชื่อ | รหัสนิสิต | คณะ | บทบาท |
|------|----------|-----|--------|
| วีรพงษ์ ฮะภูริวัฒน์ | 6810503943 | วิศวกรรมศาสตร์ | Team Leader |
| ฐิตารีย์ คำเขียว | 6810405461 | วิทยาศาสตร์ | ผู้ประสานงาน |
| ณัฐพงษ์ ภักดีวิบูลย์ | 6810503536 | วิศวกรรมศาสตร์ | Developer |
| กฤษ โล่ห์มรเวช | 6810507116 | วิศวกรรมศาสตร์ | Developer |

---

## ปัญหาที่แก้

นิสิต KU มีปัญหา 4 อย่างพร้อมกันก่อนสอบ:

- **เนื้อหายาว** — สไลด์หลายร้อยหน้า ไม่รู้จะเริ่มตรงไหน
- **สมาธิสั้น** — อ่านคนเดียวเบื่อเร็ว ไม่มีแรงจูงใจ
- **เวลาไม่ตรงกัน** — นัดติวกับเพื่อนยาก ตารางแต่ละคนต่างกัน
- **ไม่รู้ว่าตัวเองรู้จริงไหม** — อ่านแล้วรู้สึกเข้าใจ แต่พอสอบจริงทำไม่ได้

KU Prep Arena แก้ด้วยการเปลี่ยนเอกสารเป็นเกม Quiz ที่แข่งกับเพื่อนได้ทันที

---

## Features

### 1. AI Quiz — 5 มินิเกม

อัปโหลดไฟล์หรือวางลิงก์ → AI สร้าง MCQ 10 ข้อ ปรับแต่งให้เหมาะกับแต่ละเกม  
รองรับแหล่งข้อมูลหลายไฟล์พร้อมกัน โหลดเบื้องหลัง UI ใช้งานได้ระหว่างรอ

| เกม | รูปแบบ | สไตล์คำถาม |
|-----|--------|-----------|
| **Flappy Kaset** | บินนกผ่านช่องคำตอบ | สั้น ≤12 คำ |
| **Speed Racer** | เลือกเลนให้ถูกก่อนหมดเวลา | ตอบเร็ว |
| **Space Shooter** | ยิง asteroid ที่เป็นคำตอบถูก | Identification |
| **Snake Quiz** | งูกินคำตอบที่ถูก | ลำดับขั้นตอน |
| **Brick Breaker** | บอลทำลายอิฐ | นิยาม คำศัพท์ |

รองรับ: **PDF · DOCX · TXT · Google Drive · YouTube transcript**

### 2. Real-time Quiz Battle

```
Host สร้างห้อง → code 6 หลัก + QR code
↓
เพื่อนสแกน/กรอก code เข้าได้เลย (ไม่ต้อง login)
↓
แข่งพร้อมกัน → leaderboard อัปเดต real-time
```

รองรับ 10 คนต่อห้อง — Powered by **PartyKit WebSocket**

### 3. Instant Summary + Flashcards

- สรุปเนื้อหา **6–8 bullet** ทันทีหลังอัปโหลด
- Flashcard flip พร้อม Pass/Fail เพื่อ spaced repetition

### 4. Smart Planner

- กรอกวิชา + วันสอบ → คำนวณตารางเป็น micro-session 10–25 นาที
- ปรับ intensity ตามวันที่เหลือ

### 5. AI Mentor (Chatbot)

- แชทกับ AI ที่รู้จักเนื้อหาที่อัปโหลด
- Streaming response — ไม่ต้องรอให้ตอบจบ

### 6. Daily Fortune + Streak

- Tarot ดวงประจำวัน — AI สร้างคำทำนายใหม่ทุกวัน (3 การ์ด, prefetch parallel)
- **Streak tracking** — นับวันเล่นต่อเนื่อง แสดงบน Dashboard

---

## Quick Start

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
git clone https://github.com/Jinwoo290350/KU_Prep_Arena
cd KU_Prep_Arena
pnpm install
cp .env.example .env.local   # แก้ไข key ตามด้านล่าง
pnpm dev        # http://localhost:3000
pnpm dev:all    # + PartyKit WebSocket (port 1999)
```

### Environment Variables

```bash
# ── AI Backend (เลือก 1) ──────────────────────────────────────
# Option A: Typhoon API (แนะนำ — ไม่ต้อง GPU)
AI_BASE_URL=https://api.opentyphoon.ai/v1
AI_API_KEY=your_typhoon_key
AI_MODEL=typhoon-v2.5-30b-a3b-instruct

# Option B: Groq (ฟรี fallback)
# AI_BASE_URL=https://api.groq.com/openai/v1
# AI_API_KEY=gsk_your_key
# AI_MODEL=llama-3.1-8b-instant

# Option C: vLLM บน cluster (ต้อง SSH tunnel)
# AI_BASE_URL=http://localhost:8000/v1
# AI_API_KEY=none
# AI_MODEL=ku_typhoon_v1_merged

# ── Real-time ─────────────────────────────────────────────────
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999       # dev
# NEXT_PUBLIC_PARTYKIT_HOST=192.168.x.x:1999  # LAN demo

# ── Auth ──────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random-secret-min-32-chars
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# ── Database ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Supabase setup:** Dashboard → SQL Editor → รัน `src/lib/schema.sql`

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|-----|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS v4 |
| UI | ShadcnUI, Radix UI, Lucide Icons |
| Games | HTML5 Canvas, `requestAnimationFrame` |
| Real-time | PartyKit WebSocket |
| AI Primary | Typhoon API (`typhoon-v2.5-30b-a3b-instruct`) |
| AI Self-hosted | vLLM ≥0.8.0 + Fine-tuned Typhoon2-8B (KU Nontri AI A100) |
| AI Fallback | Groq API (`llama-3.1-8b-instant`) |
| Auth | NextAuth v5 — Google OAuth |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel (web), PartyKit Cloud (WS) |
| Package Manager | pnpm |

---

## ML Pipeline

### Dataset → Fine-tune → Serve

```
PDF เอกสารการเรียน
    │
    ▼
01_dataset_gen.ipynb   — PDF → MCQ แยก 5 game type
    │
    ▼
05_difficulty_rating.ipynb — Teacher model rate 1/2/3
rebalance_dataset.py       — A/B/C/D กระจายเท่ากัน
    │
    ▼
04_finetune.ipynb          — LoRA fine-tune (SLURM A100 3g.40gb)
Base: scb10x/llama-3-typhoon2.5-qwen3-4b
LoRA r=16, α=32, 4-bit NF4 (unsloth + SFTTrainer)
    │
    ▼
slurm_finetune.sh → merge LoRA → tar | split (154 × 50MB chunks)
    │
    ▼
slurm_vllm.sh → reassemble chunks → vLLM port 8000
    │
    ▼
start_tunnel.sh → Cloudflare Tunnel → อัปเดต Vercel AI_BASE_URL อัตโนมัติ
```

| | |
|--|--|
| Base model | `scb10x/llama-3-typhoon2.5-qwen3-4b` |
| Method | LoRA r=16, α=32, 4-bit NF4 (unsloth) |
| Difficulty | 3 easy : 5 medium : 2 hard per batch |
| GPU | A100 MIG 3g.40gb (KU Nontri AI) |

---

## Cluster Operations (KU Nontri AI)

```bash
ssh aip04@br2.paas.ku.ac.th

# Fine-tune
sbatch ~/ku_prep_arena/ai/scripts/slurm_finetune.sh
tail -f ~/ku_prep_arena/finetune-<JOB>.log

# Start vLLM
sbatch ~/ku_prep_arena/ai/scripts/slurm_vllm.sh
squeue -u aip04   # ดู compute node

# Start tunnel + อัปเดต Vercel อัตโนมัติ (ใน screen)
screen -S tunnel
export VERCEL_TOKEN=xxx VERCEL_PROJECT_ID=prj_xxx
bash ~/ku_prep_arena/ai/scripts/start_tunnel.sh
```

---

## Deployment

| Service | Platform |
|---------|----------|
| Web App | Vercel |
| WebSocket | PartyKit Cloud (`ku-prep-arena.jinwoo290350.partykit.dev`) |
| Database | Supabase |
| LLM (demo) | Typhoon API |
| LLM (production) | KU Nontri AI A100 + Cloudflare Tunnel |

```bash
npx vercel --prod    # deploy web
npx partykit deploy  # deploy WS server
```

---

## API Reference

### `POST /api/generate`

| Mode | Content-Type | Body |
|------|-------------|------|
| File upload | `multipart/form-data` | `file: File` |
| URL | `application/json` | `{ url, urlType: "gdrive"\|"youtube" }` |
| Re-generate | `application/json` | `{ text, gameType? }` |

**Response:**
```json
{
  "questions": [...],
  "allGameQuestions": { "flappy": [...], "racer": [...], "shooter": [...], "snake": [...], "bricks": [...] },
  "summary": ["..."],
  "extractedText": "..."
}
```

Question schema: `{ id, question, choices, correct, explanation, difficulty }` — `correct` = 0–3 index, `difficulty` = 1/2/3

### `POST /api/chat`

Streaming AI Mentor — `{ messages: [], contextText?: string }` → text stream

---

## Project Structure

```
ku-prep-arena/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── arena/                   # 5 mini-games
│   │   ├── quiz-battle/             # Multiplayer lobby/host/play
│   │   ├── flashcards/  planner/  fortune/
│   │   └── api/
│   │       ├── generate/route.ts    # AI pipeline (parse→condense→generate×5)
│   │       ├── chat/route.ts        # Streaming AI Mentor
│   │       └── scores/  exams/  auth/
│   ├── components/                  # UI + game components
│   └── lib/
│       ├── questions-context.tsx    # Multi-source quiz state
│       ├── use-scores.ts            # Best scores (Supabase + localStorage)
│       ├── use-streak.ts            # Daily streak tracking
│       └── use-exams.ts             # Exam planner
├── party/game.ts                    # PartyKit WebSocket server
└── ai/
    ├── notebooks/                   # Data pipeline (01–06)
    ├── scripts/                     # SLURM + tunnel automation
    └── dataset/rated/               # Labeled MCQ dataset
```

---

## Acknowledgements

Computational resources: **KU Nontri AI**, Kasetsart University  
Base model: [Typhoon2.5-Qwen3-4B](https://huggingface.co/scb10x/llama-3-typhoon2.5-qwen3-4b) by SCB 10X
