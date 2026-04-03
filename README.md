<div align="center">

# KU Prep Arena

**เปลี่ยนการทบทวนบทเรียนให้เป็นเกม — แข่งกับเพื่อนแบบ real-time**

แอปเตรียมสอบ AI สำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์  
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

KU Prep Arena แก้ด้วยการเปลี่ยนเอกสารเป็นเกม Quiz ที่แข่งกับเพื่อนได้ทันที โดยไม่ต้องนัดหมาย

---

## Features

### 1. AI Quiz — 5 มินิเกม

อัปโหลดไฟล์หรือวางลิงก์ → AI วิเคราะห์เนื้อหาและสร้าง MCQ 10 ข้อ ปรับแต่งให้เหมาะกับแต่ละเกม

| เกม | รูปแบบการเล่น | สไตล์คำถาม |
|-----|--------------|-----------|
| **Flappy Kaset** | บินนกผ่านช่องคำตอบ | สั้น กระชับ ≤12 คำ |
| **Speed Racer** | เลือกเลนถูกก่อนหมดเวลา | ตอบเร็ว ไม่มีเวลาคิดนาน |
| **Space Shooter** | ยิง asteroid ที่เป็นคำตอบถูก | Identification — "คำใดหมายถึง...?" |
| **Snake Quiz** | งูกินคำตอบที่ถูกต้อง | ลำดับขั้นตอน กระบวนการ |
| **Brick Breaker** | บอลทำลายอิฐ | นิยาม คำศัพท์เฉพาะ |

รองรับแหล่งข้อมูล: **PDF · DOCX · TXT · Google Drive · YouTube (transcript)**

### 2. Real-time Quiz Battle

แข่งกับเพื่อนพร้อมกัน ไม่ต้องติดตั้งอะไรเพิ่ม

```
Host สร้างห้อง → ได้ code 6 หลัก + QR code
↓
เพื่อนสแกน/กรอก code → เข้าร่วมได้เลย
↓
แข่งพร้อมกัน → Live leaderboard อัปเดต real-time
```

- รองรับ 10 คนต่อห้อง
- Powered by **PartyKit WebSocket**

### 3. Instant Summary + Flashcards

- สรุปเนื้อหาเป็น **6–8 bullet points** ทันทีหลังอัปโหลด
- สร้าง **Flashcard** flip card อัตโนมัติ — กด Pass เพื่อวนทบทวนซ้ำ

### 4. Smart Planner

- กรอกชื่อวิชาและวันสอบ
- ระบบคำนวณตารางอ่านเป็น **micro-session 10–25 นาที**
- ปรับ intensity ได้ตามเวลาที่เหลือ

### 5. AI Mentor (Chatbot)

- แชทกับ AI ที่ **รู้จักเนื้อหาที่คุณอัปโหลด**
- Streaming response — ตอบแบบ real-time ไม่ต้องรอ
- ถามอธิบายแนวคิด ขอตัวอย่าง หรือทบทวนได้

### 6. Daily Fortune

- ดึงดวงประจำวัน + Tarot card สไตล์นิสิตไทย
- Streak system + Streak Freezing (freeze แทน reset เมื่อขาดวัน)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Next.js 16 (Vercel)                │
│                                                     │
│  React 19 + TailwindCSS v4 + ShadcnUI              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ 5 Games  │  │ Planner  │  │  AI Mentor Chat  │  │
│  │ Canvas   │  │ Flashcard│  │  Streaming SSE   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │           POST /api/generate                │    │
│  │  Parser → Summarizer → QuestionGen ×5       │    │
│  └─────────────────┬───────────────────────────┘    │
└────────────────────┼────────────────────────────────┘
                     │ OpenAI-compatible API
          ┌──────────┴──────────┐
          │                     │
   ┌──────▼──────┐      ┌───────▼──────┐
   │  Groq API   │      │  vLLM on     │
   │  (fallback) │      │  KU A100     │
   │  llama-3.1  │      │  Typhoon2.5  │
   └─────────────┘      │  fine-tuned  │
                        └──────┬───────┘
                               │ Cloudflare Tunnel
                        ┌──────▼───────┐
                        │ br1 login    │
                        │ → dgx-04:8000│
                        └──────────────┘

┌──────────────────┐    ┌──────────────────┐
│  PartyKit Cloud  │    │    Supabase       │
│  WebSocket       │    │  users / scores   │
│  Quiz Battle     │    │  exams            │
└──────────────────┘    └──────────────────┘
```

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|-----|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS v4 |
| UI Components | ShadcnUI, Radix UI |
| Games | HTML5 Canvas, `requestAnimationFrame` |
| Real-time | PartyKit WebSocket |
| AI Inference | vLLM ≥0.8.0 (OpenAI-compatible API) |
| LLM Primary | Typhoon2.5-Qwen3-4B + LoRA fine-tune (KU Nontri AI A100) |
| LLM Fallback | Groq API — `llama-3.1-8b-instant` |
| Auth | NextAuth v5 — Google OAuth + Credentials (PBKDF2) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel (web), PartyKit Cloud (WS), Cloudflare Tunnel (vLLM) |
| Package Manager | pnpm |

---

## ML Pipeline

### Dataset → Fine-tune → Serve

```
PDF เอกสารการเรียน
    │
    ▼
01_dataset_gen.ipynb
    GPT-4o / Claude สร้าง MCQ แยกตาม game type
    │
    ▼
05_difficulty_rating.ipynb
    Teacher model rate difficulty 1/2/3
    rebalance_dataset.py → A/B/C/D กระจายเท่ากัน
    │
    ▼
04_finetune.ipynb  (SLURM A100 — 3g.40gb MIG)
    Base: scb10x/llama-3-typhoon2.5-qwen3-4b
    LoRA r=16, α=32, 4-bit (unsloth + SFTTrainer)
    EarlyStopping patience=3, cosine LR
    │
    ▼
slurm_finetune.sh → merge LoRA → /tmp/ku_typhoon_v1_merged
    tar | split → 154 × 50MB chunks บน NFS
    │
    ▼
slurm_vllm.sh → reassemble → vLLM serve port 8000
    │
    ▼
Cloudflare Tunnel → Vercel API Route
```

### Training Details

| | |
|--|--|
| Base model | `scb10x/llama-3-typhoon2.5-qwen3-4b` |
| Method | LoRA r=16, α=32, 4-bit NF4 (unsloth) |
| Training data | `ai/dataset/rated/` — MCQ พร้อม difficulty label |
| Difficulty distribution | 3 easy : 5 medium : 2 hard |
| Answer balance | A/B/C/D กระจายเท่ากัน (stratified) |
| Inference | vLLM ≥0.8.0, bfloat16, max_model_len=8192 |
| GPU | A100 MIG 3g.40gb (KU Nontri AI) |

### Why NFS → /tmp?

Cluster NFS ไม่รองรับ large mmap write (safetensors) → `OSError: errno 71`  
แก้โดยใช้ `/tmp` local SSD ทั้งหมด แล้ว persist ด้วย `tar | split` เป็น 154 chunks บน NFS

---

## Quick Start

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# 1. Clone และ install
git clone https://github.com/your-org/ku-prep-arena
cd ku-prep-arena
pnpm install

# 2. สร้าง .env.local (ดูตัวอย่างด้านล่าง)

# 3. รัน database schema
# ไปที่ Supabase Dashboard → SQL Editor → รัน src/lib/schema.sql

# 4. Start
pnpm dev        # Next.js → http://localhost:3000
pnpm dev:all    # Next.js + PartyKit (port 3000 + 1999)
```

### Environment Variables

```bash
# ── AI Backend ──────────────────────────────────
# Option A: Groq (ฟรี ไม่ต้อง GPU)
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_your_key_here
AI_MODEL=llama-3.1-8b-instant

# Option B: vLLM บน cluster (ต้อง SSH tunnel + Cloudflare tunnel)
# AI_BASE_URL=https://your-tunnel.trycloudflare.com/v1
# AI_API_KEY=none
# AI_MODEL=ku_typhoon_v1_merged

# ── Real-time ────────────────────────────────────
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999

# ── Auth ─────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# ── Database ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Cluster Operations (KU Nontri AI)

```bash
ssh aip04@br1.paas.ku.ac.th

# Fine-tune (ครั้งเดียว หรือเมื่อมี dataset ใหม่)
sbatch ~/ku_prep_arena/ai/scripts/slurm_finetune.sh
tail -f ~/ku_prep_arena/finetune-<JOB>.log

# Start vLLM inference server
sbatch ~/ku_prep_arena/ai/scripts/slurm_vllm.sh
squeue -u aip04   # ดู node → เช่น dgx-04

# SSH port forward (login node → compute node)
ssh -N -L 8001:dgx-04:8000 localhost &

# เปิด Cloudflare tunnel (ใน screen)
screen -S tunnel
~/cloudflared tunnel --url http://localhost:8001 --protocol http2
# Ctrl+A D ← detach

# หรือใช้ script อัตโนมัติ (update Vercel env ด้วย)
export VERCEL_TOKEN=xxx
export VERCEL_PROJECT_ID=prj_xxx
bash ~/ku_prep_arena/ai/scripts/start_tunnel.sh
```

> **หมายเหตุ:** `/tmp` เป็น node-local SSD — หาย เมื่อ job จบ  
> `slurm_vllm.sh` reassemble model จาก 154 chunks ที่ `~/ku_prep_arena/ai/models/ku_typhoon_split/` อัตโนมัติ

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Web App | Vercel | `https://ku-prep-arena-pjsw.vercel.app` |
| WebSocket | PartyKit Cloud | `ku-prep-arena.jinwoo290350.partykit.dev` |
| LLM API | KU Nontri AI A100 + Cloudflare Tunnel | Dynamic — เปลี่ยนทุก restart |
| Database | Supabase | `zvkfvgwmdwmuudxatnng.supabase.co` |

```bash
# Deploy web
npx vercel --prod

# Deploy PartyKit
npx partykit deploy
```

**หลัง deploy Vercel ครั้งแรก:**
1. ตั้ง `NEXTAUTH_URL` = URL จริงของ Vercel → Redeploy
2. เพิ่ม redirect URI ใน Google OAuth Console:  
   `https://your-app.vercel.app/api/auth/callback/google`
3. เมื่อ Cloudflare tunnel URL เปลี่ยน → อัปเดต `AI_BASE_URL` ใน Vercel → Redeploy

---

## API Reference

### `POST /api/generate`

| Mode | Content-Type | Body |
|------|-------------|------|
| File upload | `multipart/form-data` | `file: File, gameType?: string` |
| URL | `application/json` | `{ url, urlType: "gdrive"\|"youtube" }` |
| Text / Re-generate | `application/json` | `{ text, gameType? }` |

**Response:**
```json
{
  "questions": [...],
  "allGameQuestions": { "flappy": [...], "racer": [...], "shooter": [...], "snake": [...], "bricks": [...] },
  "summary": ["bullet 1", "..."],
  "extractedText": "..."
}
```

**Question schema:**
```json
{
  "id": 1,
  "question": "คำถาม",
  "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct": 2,
  "explanation": "คำอธิบายสั้น",
  "difficulty": 2
}
```
`correct` = index 0–3 | `difficulty` = 1 (recall) · 2 (apply) · 3 (analyze)

### `POST /api/chat`

Streaming chat กับ AI Mentor — ส่ง `{ messages: [], contextText: string }` → ได้ text stream

---

## Database Schema

```sql
-- Users (สำหรับ credentials login)
app_users (id uuid, username text unique, salt text, password_hash text, created_at)

-- Game scores
scores (id uuid, user_email text, game_id text, score int, created_at)

-- Exam schedule (Smart Planner)
exams (id uuid, user_email text, name text, date text, created_at)
```

Full schema: [src/lib/schema.sql](src/lib/schema.sql)

---

## Project Structure

```
ku-prep-arena/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Dashboard
│   │   ├── login/                        # Login (Google + Credentials)
│   │   ├── arena/                        # Game Hub
│   │   │   ├── flappy/  racer/  shooter/ snake/  bricks/
│   │   ├── quiz-battle/                  # Multiplayer
│   │   │   ├── page.tsx                  # Lobby
│   │   │   ├── host/[code]/              # Host view
│   │   │   └── play/[code]/              # Player view
│   │   ├── flashcards/  planner/  fortune/
│   │   └── api/
│   │       ├── generate/route.ts         # AI question pipeline
│   │       ├── chat/route.ts             # Streaming AI Mentor
│   │       ├── scores/  exams/  auth/
│   ├── components/                       # React UI components
│   ├── lib/
│   │   ├── questions-context.tsx         # Global quiz state
│   │   ├── supabase.ts                   # DB client
│   │   ├── schema.sql                    # Database schema
│   │   └── party-types.ts                # WS message types
│   ├── auth.ts                           # NextAuth (Node.js)
│   ├── auth.config.ts                    # NextAuth (Edge-safe)
│   └── middleware.ts                     # Route protection
├── party/
│   └── game.ts                           # PartyKit WS server
├── ai/
│   ├── notebooks/
│   │   ├── 01_dataset_gen.ipynb          # PDF → MCQ
│   │   ├── 02_game_agents.ipynb          # Prompt evaluation
│   │   ├── 03_evaluation.ipynb           # Balance metrics
│   │   ├── 04_finetune.ipynb             # LoRA fine-tune
│   │   ├── 05_difficulty_rating.ipynb    # Teacher labeling
│   │   └── 06_claude_teacher.ipynb       # Claude teacher
│   ├── scripts/
│   │   ├── slurm_finetune.sh             # SLURM fine-tune job
│   │   ├── slurm_vllm.sh                 # SLURM vLLM server
│   │   ├── start_tunnel.sh               # Cloudflare + Vercel auto-update
│   │   └── rebalance_dataset.py          # A/B/C/D balance
│   └── dataset/rated/                    # Labeled MCQ dataset
└── public/icon.svg
```

---

## Acknowledgements

Computational resources provided by **KU Nontri AI**, Kasetsart University  
Base model: [Typhoon2.5-Qwen3-4B](https://huggingface.co/scb10x/llama-3-typhoon2.5-qwen3-4b) by SCB 10X
