# KU Prep Arena

แอปเตรียมสอบที่ใช้ AI สร้างคำถามจากไฟล์เอกสาร แล้วนำมาเล่นผ่านมินิเกม 5 แบบ
Built with Next.js 16 + React 19 · AI via Groq (free) or Qwen on KU Nontri A100

---

## Features

| หมวด | รายละเอียด |
|------|-----------|
| **Upload** | อัปโหลด PDF / DOCX / TXT → AI สรุปเนื้อหา + สร้าง 10 คำถาม |
| **Flappy Kaset** | True/False — บินผ่านช่องบน (TRUE) หรือล่าง (FALSE) |
| **Speed Racer** | MCQ 4 ตัวเลือก — เลือกช่องทางถูกก่อนหมดเวลา |
| **Space Shooter** | ยิง asteroid ที่เป็นคำตอบถูก |
| **Snake Quiz** | งูกินคำตอบที่ถูก — ขั้นตอน/ลำดับ |
| **Brick Breaker** | ลูกบอลทำลายอิฐ — นิยามและคำศัพท์ |
| **Flashcards** | พลิกการ์ด + ระบบ Pass เพื่อทบทวนซ้ำ |
| **Study Mode** | แนะนำหัวข้อที่ควรอ่านก่อน/หลัง |
| **AI Mentor** | แชทกับ AI ถามเกี่ยวกับเนื้อหา |

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI**: shadcn/ui + Radix UI
- **Games**: HTML5 Canvas (`useRef` + `requestAnimationFrame`)
- **AI**: OpenAI-compatible API — Groq (cloud) หรือ vLLM บน A100 (local)
- **Models**: `llama-3.1-8b-instant` (Groq) / `Qwen2.5-7B-Instruct-AWQ` (A100)
- **PDF parsing**: `unpdf` (PDF.js based, Next.js App Router compatible)
- **Package manager**: pnpm

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd KU_Prep_Arena
pnpm install
```

### 2. Environment

สร้างไฟล์ `.env.local` (ห้าม commit ไฟล์นี้):

```bash
cp .env.local.example .env.local   # ถ้ามี example
# หรือสร้างใหม่:
```

**Option A — Groq (ฟรี, ไม่ต้อง GPU):**
```env
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
AI_MODEL=llama-3.1-8b-instant
```
ลงทะเบียนฟรีที่ [console.groq.com](https://console.groq.com)

**Option B — KU Nontri A100 (ดูส่วน AI Section ด้านล่าง):**
```env
AI_BASE_URL=http://localhost:8000/v1
AI_API_KEY=none
AI_MODEL=Qwen/Qwen2.5-7B-Instruct-AWQ
```

### 3. Run

```bash
pnpm dev
# เปิด http://localhost:3000
```

---

## AI Section (KU Nontri A100)

โฟลเดอร์ `ai/` สำหรับรัน Qwen บน GPU cluster ของ KU

### โครงสร้าง

```
ai/
├── scripts/
│   ├── slurm_vllm.sh       # Submit vLLM job บน SLURM
│   └── slurm_notebook.sh   # Submit Jupyter Notebook job
├── notebooks/
│   ├── 01_dataset_gen.ipynb   # สร้าง dataset คำถาม (PDF → JSON)
│   ├── 02_game_agents.ipynb   # ทดสอบ prompt แต่ละเกม
│   └── 03_evaluation.ipynb    # วัด metrics ความถูกต้อง
├── agents/
│   ├── prompts.py          # System prompts แต่ละเกม
│   └── generate.py         # Script: PDF → questions via vLLM
├── eval/
│   ├── metrics.py          # คำนวณ eval metrics
│   └── run_eval.py         # Main evaluation runner
└── dataset/
    ├── sample_pdfs/        # PDF ตัวอย่าง
    └── generated/          # Output JSON questions
```

### วิธีเริ่ม vLLM บน A100

```bash
# 1. SSH เข้า login node
ssh aip04@br1.paas.ku.ac.th

# 2. Submit SLURM job
module load slurm
sbatch ~/ku_prep_arena/ai/scripts/slurm_vllm.sh

# 3. ดู job ID และ node
squeue -u aip04

# 4. ดู log จนเห็น "Uvicorn running on http://0.0.0.0:8000"
tail -f ~/ku_prep_arena/vllm-<JOB_ID>.log

# 5. เปิด SSH tunnel บน Mac (แทน dgx-XX ด้วย node จาก squeue)
ssh -N -L 8000:dgx-XX:8000 aip04@br1.paas.ku.ac.th

# 6. ทดสอบ
curl http://localhost:8000/v1/models
```

### วิธีเริ่ม Jupyter Notebook บน A100

```bash
# Submit job
sbatch ~/ku_prep_arena/ai/scripts/slurm_notebook.sh

# ดู log
tail -f ~/ku_prep_arena/jupyter-<JOB_ID>.log

# Copy SSH tunnel command จาก log แล้วรันบน Mac
# เปิด http://localhost:8888 ใส่ token จาก log
```

### Dependencies (Python)

```bash
pip install -r ai/requirements.txt
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # POST: PDF → summary + questions
│   │   └── chat/route.ts       # POST: AI mentor chat
│   ├── arena/
│   │   ├── flappy/             # Flappy Kaset (True/False)
│   │   ├── racer/              # Speed Racer (MCQ)
│   │   ├── shooter/            # Space Shooter
│   │   ├── snake/              # Snake Quiz
│   │   └── bricks/             # Brick Breaker
│   ├── flashcards/             # Flashcard deck
│   └── planner/                # Smart study planner
├── components/
│   ├── flappy-kaset-game.tsx
│   ├── speed-racer-game.tsx
│   ├── space-shooter-game.tsx
│   ├── snake-quiz-game.tsx
│   ├── brick-breaker-game.tsx
│   ├── flashcards-content.tsx
│   └── ui/                     # shadcn/ui components
└── hooks/
    └── use-questions.ts        # Global quiz context
```

---

## API

### `POST /api/generate`

**File upload (ครั้งแรก):**
```
Content-Type: multipart/form-data
Body: { file: File, gameType?: string }
```

**Re-generate สำหรับเกมใดเกมหนึ่ง:**
```
Content-Type: application/json
Body: { text: string, gameType: "flappy"|"racer"|"shooter"|"snake"|"bricks" }
```

**Response:**
```json
{
  "questions": [...],
  "summary": ["bullet 1", "bullet 2", ...],
  "extractedText": "..."
}
```

---

## Acknowledgements

> Computational resources supported by **KU Nontri AI**, Kasetsart University
> Model: Qwen2.5-7B-Instruct-AWQ by Alibaba Cloud
