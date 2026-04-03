# KU Prep Arena

**แอปเตรียมสอบ AI สำหรับนิสิตมหาวิทยาลัยเกษตรศาสตร์**

> KU AI Pioneers: Forward Challenge — Theme: "AI for Gen Z Lifestyle @KU"  
> Team: **dek vid sigma skibidi rizz**

| # | ชื่อ | รหัส | คณะ | บทบาท |
|---|------|------|-----|--------|
| 1 | วีรพงษ์ ฮะภูริวัฒน์ | 6810503943 | วิศวกรรมศาสตร์ | Team Leader |
| 2 | ฐิตารีย์ คำเขียว | 6810405461 | วิทยาศาสตร์ | ผู้ประสานงาน |
| 3 | ณัฐพงษ์ ภักดีวิบูลย์ | 6810503536 | วิศวกรรมศาสตร์ | — |
| 4 | กฤษ โล่ห์มรเวช | 6810507116 | วิศวกรรมศาสตร์ | — |

---

## ปัญหาที่แก้

นิสิตมหาวิทยาลัยเกษตรศาสตร์มีปัญหาการจดจ่อในการทบทวนบทเรียน — เนื้อหายาว เวลาจำกัด ตารางเรียนไม่ตรงกัน และเร่งอ่านก่อนสอบ KU Prep Arena เปลี่ยนการทบทวนให้เป็นเกมที่สนุก แข่งกับเพื่อนแบบ real-time ได้

---

## Features

### Game Hub — 5 มินิเกม
อัปโหลด PDF / DOCX / TXT หรือลิงก์ Google Drive / YouTube → AI สร้าง MCQ 10 ข้อโดยอัตโนมัติ

| เกม | ลักษณะคำถาม |
|-----|------------|
| **Flappy Kaset** | คำถามสั้น ≤12 คำ บินผ่านช่องคำตอบถูก |
| **Speed Racer** | ตอบแข่งเวลา เลือกช่องทางที่ถูกต้อง |
| **Space Shooter** | ยิง asteroid — "Which term describes...?" |
| **Snake Quiz** | งูกินคำตอบ — ลำดับขั้นตอน/กระบวนการ |
| **Brick Breaker** | ทำลายอิฐ — นิยามและคำศัพท์เฉพาะ |

### Real-time Quiz Battle (Multiplayer)
- Host สร้างห้อง → ได้ code 6 หลัก + QR code
- ผู้เล่นสแกน/กรอก code เข้าร่วม รองรับ 10 คน
- Live leaderboard ระหว่างเล่น
- Powered by PartyKit WebSocket

### Instant Summary & Flashcards
- สรุปเอกสารเป็น 6–8 bullet points ทันทีหลังอัปโหลด
- Flashcard flip card สำหรับทบทวนด้วยตัวเอง

### Smart Planner
- กรอกวันสอบ → ระบบคำนวณ micro-session 10–25 นาที
- จัดตารางรายวัน ปรับ intensity ได้
- บันทึก exam schedule ไว้ใน Supabase

### AI Mentor (Chatbot)
- แชทกับ AI ที่รู้จักเนื้อหาที่อัปโหลด
- Streaming response แบบ real-time
- ถามอธิบายแนวคิดหรือทบทวนเนื้อหาได้

### Daily Fortune & Gamification
- ดึงดวงประจำวัน + Tarot card สไตล์นิสิตไทย
- XP & Leaderboard, Streak system
- Streak Freezing — freeze แทน reset เมื่อขาดวัน

---

## Tech Stack

### Frontend & API
- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **TailwindCSS v4**, **ShadcnUI** (Radix UI)
- Games: HTML5 Canvas (`useRef` + `requestAnimationFrame`)
- Package manager: **pnpm**

### Real-time
- **PartyKit** — WebSocket server `party/game.ts`
- Deployed: `ku-prep-arena.jinwoo290350.partykit.dev`

### AI / LLM
- **Primary:** Fine-tuned Typhoon2.5-Qwen3-4B (LoRA) served via vLLM บน KU Nontri AI A100
- **Fallback:** Groq API (`llama-3.1-8b-instant`) — ใช้ได้เลยไม่ต้องการ cluster
- **Multi-agent pipeline:** Parser → Summarizer → Question Generator (5 game types ขนานกัน)

### Database & Auth
- **Supabase** — PostgreSQL (users, scores, exams)
- **NextAuth v5** — Google OAuth + Username/Password (PBKDF2 + salt)

---

## Project Structure

```
KU_Prep_Arena/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Dashboard / Home
│   │   ├── login/                       # Login page
│   │   ├── arena/                       # Game Hub
│   │   │   ├── flappy/                  # Flappy Kaset
│   │   │   ├── racer/                   # Speed Racer
│   │   │   ├── shooter/                 # Space Shooter
│   │   │   ├── snake/                   # Snake Quiz
│   │   │   └── bricks/                  # Brick Breaker
│   │   ├── quiz-battle/                 # Real-time Multiplayer
│   │   │   ├── page.tsx                 # Lobby (host / join)
│   │   │   ├── host/[code]/             # Host view
│   │   │   └── play/[code]/             # Player view
│   │   ├── flashcards/                  # Flashcard study mode
│   │   ├── planner/                     # Smart Planner
│   │   ├── fortune/                     # Daily Fortune
│   │   └── api/
│   │       ├── generate/route.ts        # AI question generation
│   │       ├── chat/route.ts            # AI Mentor streaming chat
│   │       ├── scores/                  # Score CRUD
│   │       ├── exams/                   # Exam schedule CRUD
│   │       └── auth/                    # NextAuth handlers
│   ├── components/                      # React components
│   ├── lib/
│   │   ├── supabase.ts                  # Supabase client (anon + admin)
│   │   ├── schema.sql                   # Database schema
│   │   ├── questions-context.tsx        # Global question state
│   │   └── party-types.ts               # PartyKit message types
│   └── auth.ts                          # NextAuth config
├── party/
│   └── game.ts                          # PartyKit WebSocket server
├── ai/
│   ├── notebooks/
│   │   ├── 01_dataset_gen.ipynb         # PDF → MCQ dataset
│   │   ├── 02_game_agents.ipynb         # ทดสอบ/เปรียบเทียบ prompt แต่ละเกม
│   │   ├── 03_evaluation.ipynb          # Balance & diversity metrics
│   │   ├── 04_finetune.ipynb            # LoRA fine-tune (unsloth + SFTTrainer)
│   │   ├── 05_difficulty_rating.ipynb   # Teacher model rate difficulty
│   │   └── 06_claude_teacher.ipynb      # Claude-based teacher labeling
│   ├── scripts/
│   │   ├── slurm_finetune.sh            # Fine-tune job (SLURM)
│   │   ├── slurm_vllm.sh                # vLLM inference server (SLURM)
│   │   ├── slurm_teacher.sh             # Teacher model server (SLURM)
│   │   ├── download_typhoon.sh          # Download base model to cluster
│   │   ├── merge_lora.sh                # Merge LoRA adapter
│   │   ├── rebalance_dataset.py         # Balance A/B/C/D answer distribution
│   │   └── fix_flappy_choices.py        # Fix choice format issues
│   └── dataset/
│       └── rated/                       # Labeled training data (gitignored)
├── public/
│   └── icon.svg
├── partykit.json
└── CLAUDE.md
```

---

## Quick Start

### Prerequisites
- Node.js 20+, pnpm 9+

### 1. Install
```bash
pnpm install
```

### 2. Environment variables
สร้างไฟล์ `.env.local`:

```bash
# ── AI Backend ──────────────────────────────────────────────────
# Option A: Groq (ฟรี ไม่ต้อง GPU — ลงทะเบียนที่ console.groq.com)
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_your_key_here
AI_MODEL=llama-3.1-8b-instant

# Option B: vLLM บน KU cluster (ต้องเปิด SSH tunnel ก่อน)
# AI_BASE_URL=http://localhost:8000/v1
# AI_API_KEY=none
# AI_MODEL=ku_typhoon_v1_merged

# ── PartyKit ────────────────────────────────────────────────────
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999          # local dev
# NEXT_PUBLIC_PARTYKIT_HOST=192.168.x.x:1999     # LAN demo (ใส่ IP จริงของ Mac)

# ── Auth (NextAuth v5) ──────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# ── Supabase ────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Setup database
รัน SQL ใน Supabase Dashboard → SQL Editor:
```sql
-- ดูไฟล์ src/lib/schema.sql
```

### 4. Run
```bash
pnpm dev        # Next.js only → http://localhost:3000
pnpm dev:all    # Next.js + PartyKit (port 3000 + 1999)
```

---

## API Reference

### `POST /api/generate`
สร้างคำถาม MCQ จากเอกสาร

**File upload:**
```
Content-Type: multipart/form-data
Body: { file: File, gameType?: "flappy"|"racer"|"shooter"|"snake"|"bricks" }
```

**URL input (Google Drive / YouTube):**
```json
{ "url": "https://...", "urlType": "gdrive" | "youtube" }
```

**Re-generate สำหรับเกมเดียว (ไม่ต้อง upload ซ้ำ):**
```json
{ "text": "...", "gameType": "flappy" }
```

**Response:**
```json
{
  "questions": [...],
  "allGameQuestions": {
    "flappy": [...], "racer": [...], "shooter": [...],
    "snake": [...], "bricks": [...]
  },
  "summary": ["bullet 1", "bullet 2", "..."],
  "extractedText": "..."
}
```

**Question schema:**
```json
{
  "id": 1,
  "question": "...",
  "choices": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct": 2,
  "explanation": "...",
  "difficulty": 2
}
```
- `correct` = index 0–3
- `difficulty` = 1 (easy/recall) | 2 (medium/apply) | 3 (hard/analyze)

### `POST /api/chat`
AI Mentor streaming chat — ส่ง messages array + contextText (เนื้อหาที่อัปโหลด), ได้ text stream กลับมา

---

## ML Model

### Fine-tuned Model Details

| Property | Value |
|----------|-------|
| Base model | `scb10x/llama-3-typhoon2.5-qwen3-4b` |
| Fine-tune method | LoRA r=16, α=32, 4-bit (unsloth) |
| Training data | `ai/dataset/rated/*.json` |
| Adapter output | `ai/models/ku_typhoon_v1/` |
| Merged model path | `/tmp/ku_typhoon_v1_merged` (node-local SSD) |
| Persisted chunks | `~/ku_prep_arena/ai/models/ku_typhoon_split/` (154 × 50MB) |
| Difficulty balance | 3 easy / 5 medium / 2 hard per batch |
| Answer balance | A/B/C/D กระจายเท่ากัน (stratified shuffle) |

### AI Pipeline

```
POST /api/generate
       │
       ▼
 Agent 0 — Parser
  PDF / DOCX / TXT / Google Drive / YouTube → plain text (max 4,000 chars)
       │
       ├──────────────────── parallel ────────────────────────┐
       ▼                                                       ▼
 Agent 1 — Summarizer                            Agent 2 — Question Generator × 5
  → 6–8 bullet points                             flappy / racer / shooter / snake / bricks
       │                                                       │
       └─────────────────────── response ────────────────────-┘
  { questions, allGameQuestions, summary, extractedText }
```

---

## Cluster Setup (KU Nontri AI)

```bash
# SSH เข้า cluster
ssh aip04@br2.paas.ku.ac.th

# 1. Fine-tune model
sbatch ~/ku_prep_arena/ai/scripts/slurm_finetune.sh
tail -f ~/ku_prep_arena/finetune-<JOB>.log

# 2. Start vLLM inference server
sbatch ~/ku_prep_arena/ai/scripts/slurm_vllm.sh
squeue -u aip04            # ดู node เช่น dgx-02

# 3. เปิด SSH tunnel จาก local machine
ssh -N -L 8000:dgx-02:8000 aip04@br2.paas.ku.ac.th

# 4. เปิด Cloudflare tunnel (ใน screen session บน cluster)
screen -S tunnel
cloudflared tunnel --url http://localhost:8000 --protocol http2
# Ctrl+A D เพื่อ detach session
```

> `/tmp` เป็น node-local SSD — model จะหายเมื่อ job สิ้นสุด  
> `slurm_vllm.sh` จะ reassemble อัตโนมัติจาก 154 chunks ที่ `~/ku_prep_arena/ai/models/ku_typhoon_split/`

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Web App | Vercel | `https://your-app.vercel.app` |
| PartyKit | PartyKit Cloud | `ku-prep-arena.jinwoo290350.partykit.dev` |
| vLLM | KU Nontri AI A100 + Cloudflare Tunnel | Dynamic (เปลี่ยนทุก tunnel restart) |
| Database | Supabase | `zvkfvgwmdwmuudxatnng.supabase.co` |

### Deploy to Vercel
```bash
npx vercel --prod
```
ใส่ env vars ทั้งหมดใน Vercel Dashboard → Settings → Environment Variables  
หลัง deploy: อัปเดต `NEXTAUTH_URL` เป็น Vercel URL จริง → Redeploy  
เพิ่ม redirect URI ใน Google OAuth Console: `https://your-app.vercel.app/api/auth/callback/google`

### Deploy PartyKit
```bash
npx partykit deploy
```

---

## Database Schema

```sql
app_users (id, username, salt, password_hash, created_at)
scores    (id, user_email, game_id, score, created_at)
exams     (id, user_email, name, date, created_at)
```

Full schema: [src/lib/schema.sql](src/lib/schema.sql)

---

## Known Issues

- **Cloudflare Tunnel URL** เปลี่ยนทุกครั้งที่ restart → ต้องอัปเดต `AI_BASE_URL` ใน `.env.local` และ Vercel (Free tier ไม่มี persistent URL)
- **NFS write limit บน cluster** — ไม่รองรับ large mmap write (safetensors) → ใช้ `/tmp` local SSD แทน
- **CUDA_VISIBLE_DEVICES=0** จำเป็นบน MIG slice เพราะ SLURM set UUID format ที่ vLLM parse ไม่ได้
- **PartyKit** รองรับ 10 คนต่อห้องในระยะแรก
- **Dataset files** (`ai/dataset/`) ถูก gitignore → ต้อง `scp` ขึ้น cluster ก่อน fine-tune

---

## Acknowledgements

> Computational resources supported by **KU Nontri AI**, Kasetsart University  
> Base model: Typhoon2.5-Qwen3-4B by SCB 10X
