# KU Prep Arena — CLAUDE.md

## Project Context

**ชื่อโครงการ:** KU Prep
**การแข่งขัน:** KU AI Pioneers: Forward Challenge — Theme: "AI for Gen Z Lifestyle @KU"
**ทีม:** dek vid sigma skibidi rizz

| # | ชื่อ | รหัส | คณะ | บทบาท |
|---|------|-------|-----|--------|
| 1 | วีรพงษ์ ฮะภูริวัฒน์ | 6810503943 | วิศวกรรมศาสตร์ | Team Leader |
| 2 | ฐิตารีย์ คำเขียว | 6810405461 | วิทยาศาสตร์ | ผู้ประสานงาน |
| 3 | ณัฐพงษ์ ภักดีวิบูลย์ | 6810503536 | วิศวกรรมศาสตร์ | — |
| 4 | กฤษ โล่ห์มรเวช | 6810507116 | วิศวกรรมศาสตร์ | — |

**ปัญหาที่แก้:** นิสิตมหาวิทยาลัยเกษตรศาสตร์มีปัญหาการจดจ่อในการทบทวนบทเรียน
เนื้อหายาว เวลาจำกัด ตารางเรียนไม่ตรงกัน และการเรียนแบบเร่งรีบก่อนสอบ

---

## Features ทั้งหมด (ตาม Proposal)

### 1. AI Quiz Battle (หลัก)
- สร้างคำถาม MCQ อัตโนมัติจาก PDF/เอกสารที่อัปโหลด
- **Real-time Battle** — แข่งขันกับเพื่อนพร้อมกัน (รองรับ 10 คนในระยะแรก)
- **Solo Quest** — เล่นคนเดียว หลายรูปแบบ:
  - ตอบแข่งเวลา
  - สะสมด้วมต้มผ่านด่าน
  - โหมดอาชีวิตรอด (Life system)
- ปรับระดับความยากได้ตามผู้ใช้

### 2. Instant Summary & Flashcards
- สรุปเอกสารเป็นประเด็นสั้นๆ พร้อมแหล่งอ้างอิง
- สร้าง Flashcard อัตโนมัติสำหรับทบทวนแบบรวดเร็ว

### 3. Smart Planner
- วิเคราะห์ปริมาณเนื้อหาและกำหนดการสอบ
- จัดตารางการอ่านเป็น **Micro-session 10–25 นาที**
- ปรับตารางอัตโนมัติตามตารางเวลาจริงของผู้ใช้
- ปรับความเข้มข้นได้

### 4. AI Mentor (Chatbot)
- ตอบคำถาม อธิบายแนวคิด
- ช่วยทบทวนความรู้จากเอกสารที่อัปโหลด

### 5. Gamification System
- **XP & Leaderboard** — คะแนนสะสม จัดอันดับ
- **Streak** — รักษาสถิติการเรียนต่อเนื่อง
- **Streak Freezing** — ถ้าขาดการใช้งาน จะ freeze streak ไว้แทนการ reset ทั้งหมด
- **Daily Motivation** — quote ประจำวัน สีสันมงคลตามวัฒนธรรมนิสิตไทย

### 6. Recommendation System
- แนะนำเนื้อหาที่ควรอ่านในแต่ละวัน
- พิจารณาจากวันสอบ ปริมาณเนื้อหา และพฤติกรรมการใช้งาน

---

## Technical Stack

### Frontend
- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** TailwindCSS v4, ShadcnUI
- **Package manager:** pnpm

### Real-time
- **PartyKit** — server ที่ `party/game.ts`
- Config: `partykit.json` (name: `ku-prep-arena`)
- Local: `localhost:1999` | LAN demo: `<Mac IP>:1999`

### AI / ML
- **LLM Inference:** vLLM serving `Qwen/Qwen2.5-7B-Instruct-AWQ` (KU Nontri AI A100)
- **Fine-tuned model:** LoRA adapter `ai/models/ku_quiz_v1/` (Qwen2.5-7B + LoRA r=16)
- **Fallback:** Groq API (`llama-3.1-8b-instant`) สำหรับ dev/demo ไม่ต้องการ cluster
- **AI Technologies:** NLP, Generative AI (LLM), Chatbot, Recommendation System

### AI Pipeline (Python, SLURM cluster)
```
ai/notebooks/
├── 01_dataset_gen.ipynb     # PDF → MCQ dataset (10 ข้อ / file / game type)
├── 02_game_agents.ipynb     # ทดสอบ/เปรียบเทียบ agent แต่ละ game type
├── 03_evaluation.ipynb      # วัด balance, diversity, format validity
├── 04_finetune.ipynb        # LoRA fine-tune Qwen2.5-7B (unsloth + SFTTrainer)
└── 05_difficulty_rating.ipynb  # Teacher model rate difficulty 1/2/3
```

---

## App Structure

```
src/app/
├── page.tsx                # Dashboard / home
├── arena/                  # Game Hub
│   ├── flappy/             # Flappy Kaset — ถามสั้น ≤12 คำ
│   ├── racer/              # Speed Racer — ตอบแข่งเวลา ≤12 คำ
│   ├── shooter/            # Space Shooter — "Which term describes...?"
│   ├── snake/              # Snake Quiz — sequential/process Q
│   └── bricks/             # Brick Breaker — definition Q
├── quiz-battle/            # Real-time Multiplayer
│   ├── page.tsx            # Lobby (host / join)
│   ├── host/[code]/        # Host view
│   └── play/[code]/        # Player view
├── flashcards/             # Flashcard study mode
├── planner/                # Smart Planner
└── api/
    ├── generate/route.ts   # AI question generation (main endpoint)
    └── chat/route.ts       # AI Mentor chat
```

---

## API: POST /api/generate

**Multi-agent pipeline:**
1. **Parser** — extract text จาก PDF/DOCX/TXT (max 12k chars)
2. **Summarizer** — สรุป 6–8 bullet points
3. **Question Generator** — สร้าง MCQ 10 ข้อ ตาม game type

**Input:**
- FormData: `file` + optional `gameType`
- JSON: `{ text, gameType }` สำหรับ re-generate ไม่ต้อง upload ซ้ำ

**Response:**
```json
{
  "questions": [...],
  "allGameQuestions": { "flappy": [...], "racer": [...], "shooter": [...], "snake": [...], "bricks": [...] },
  "summary": [...],
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
  "difficulty": 2,
  "game_type": "flappy"
}
```

---

## Environment Variables (.env.local)

```bash
# vLLM on cluster (default — ต้องมี SSH tunnel เปิด)
AI_BASE_URL=http://localhost:8000/v1
AI_API_KEY=none
AI_MODEL=Qwen/Qwen2.5-7B-Instruct-AWQ

# Groq (fallback — ไม่ต้องการ cluster)
# AI_BASE_URL=https://api.groq.com/openai/v1
# AI_API_KEY=gsk_...
# AI_MODEL=llama-3.1-8b-instant

# PartyKit
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
# LAN demo: NEXT_PUBLIC_PARTYKIT_HOST=192.168.x.x:1999
```

---

## Dev Commands

```bash
pnpm install              # install dependencies
pnpm dev                  # Next.js only → http://localhost:3000
pnpm dev:all              # Next.js + PartyKit (port 3000 + 1999)
pnpm build                # production build
```

---

## Cluster (KU Nontri AI — aip04@br1.paas.ku.ac.th)

```bash
# Start vLLM inference (port 8000)
sbatch ~/ku_prep_arena/ai/scripts/slurm_vllm.sh
ssh -N -L 8000:dgx-XX:8000 aip04@br1.paas.ku.ac.th

# Start teacher model for difficulty rating (port 8001)
sbatch ~/ku_prep_arena/ai/scripts/slurm_teacher.sh
ssh -N -L 8001:dgx-XX:8001 aip04@br1.paas.ku.ac.th

# Fine-tuning
sbatch ~/ku_prep_arena/ai/scripts/slurm_finetune.sh
tail -f ~/ku_prep_arena/finetune-<JOB>.log
```

**GPU:** 1g.10gb MIG slice (A100), account `gm_aip04`, partition `gpuq`
**Node:** dgx-02 (ดูจาก `squeue -u aip04`)

---

## ML Model Details

| | Value |
|--|--|
| Base model | `Qwen/Qwen2.5-7B-Instruct-AWQ` |
| Inference quant | AWQ + awq_marlin kernel |
| Fine-tune | LoRA rank=16, alpha=32, 4-bit (unsloth) |
| Training data | `ai/dataset/rated/*.json` |
| Adapter output | `ai/models/ku_quiz_v1/` |
| Difficulty | 1=easy (recall), 2=medium (apply), 3=hard (analyze) |
| Distribution | 3 easy / 5 medium / 2 hard per batch |
| Answer balance | Stratified shuffle — A/B/C/D กระจายเท่ากัน |

---

## Known Issues / Notes

- `torchao` ใน `~/.local/lib/python3.11/` conflict กับ PyTorch บน cluster — `slurm_finetune.sh` ลบอัตโนมัติด้วย `pip show torchao`
- `transformers==4.45.2` ต้อง pin สำหรับ vLLM/teacher เท่านั้น — **อย่า pin ใน fine-tuning env** (unsloth 2026 ต้องการ ≥4.51.3)
- `CUDA_VISIBLE_DEVICES=0` จำเป็นบน MIG slice (SLURM set UUID format ที่ vLLM parse ไม่ได้)
- Dataset files (`ai/dataset/`) ถูก gitignore — ต้อง `scp` ขึ้น cluster ก่อน fine-tune
- PartyKit real-time รองรับ 10 คนในระยะแรก
- ไฟล์ `ai/scripts/slurm_finetune.sh` ต้อง scp ขึ้น cluster ทุกครั้งที่แก้ไข

---

## Challenges & Solutions (จาก Proposal)

| ความท้าทาย | แนวทางรับมือ |
|------------|-------------|
| คุณภาพคำถาม AI ไม่แม่นยำ | User report system + feedback loop ปรับ prompt |
| Real-time battle ทำงานไม่สะดุด | Realtime Database เฉพาะ, จำกัด 10 คนแรก |
| ผู้ใช้ไม่กลับมาใช้ต่อเนื่อง | Streak Freezing (freeze แทน reset), daily quote |
