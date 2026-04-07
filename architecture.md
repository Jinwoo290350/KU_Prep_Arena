# KU Prep Arena — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │  5 Mini-games│  │  Quiz Battle │  │  Dashboard / Planner   │   │
│  │  HTML Canvas │  │  Multiplayer │  │  Fortune / Flashcards  │   │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘   │
│         │                 │                       │                │
│  ┌──────▼───────────────────────────────────────▼────────────┐    │
│  │               questions-context (React Context)            │    │
│  │   sources[] — multi-file state, loading/ready/error       │    │
│  │   use-scores · use-streak · use-exams (localStorage/DB)   │    │
│  └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ HTTP / WebSocket
         ┌────────────────────┼──────────────────────┐
         │                    │                      │
┌────────▼────────┐  ┌────────▼─────────┐  ┌────────▼─────────┐
│  Next.js API    │  │  PartyKit Cloud  │  │   Supabase        │
│  (Vercel)       │  │  WebSocket       │  │   PostgreSQL      │
│                 │  │  party/game.ts   │  │                   │
│ /api/generate   │  │  Quiz Battle     │  │  scores           │
│ /api/chat       │  │  real-time sync  │  │  exams            │
│ /api/scores     │  └──────────────────┘  │  app_users        │
│ /api/exams      │                        └──────────────────┘
│ /api/auth       │
└────────┬────────┘
         │ OpenAI-compatible API (HTTPS)
         │
┌────────▼──────────────────────────────────────────────────────┐
│                      AI Backend (เลือก 1)                      │
│                                                               │
│  A) Typhoon API          B) vLLM self-hosted                  │
│     opentyphoon.ai          KU Nontri AI A100                 │
│     typhoon-v2.5-30b        ku_typhoon_v1_merged              │
│     (default/demo)          (fine-tuned, production)          │
│                             ↑                                 │
│                        Cloudflare Tunnel                      │
│                        + start_tunnel.sh                      │
│                          (auto-update Vercel env)             │
│                                                               │
│  C) Groq API (fallback)                                       │
│     llama-3.1-8b-instant                                      │
└───────────────────────────────────────────────────────────────┘
```

---

## AI Generation Pipeline (`/api/generate`)

```
Client (FormData / JSON)
         │
         ▼
┌────────────────────┐
│   extractText()    │  PDF → unpdf (WASM) → cleanPdf()
│                    │  DOCX → mammoth    → cleanDocx()
│                    │  TXT               → cleanTxt()
│                    │  YouTube           → youtube-transcript → cleanTranscript()
│                    │  Google Drive      → export?format=txt → cleanTxt()
│  max 12,000 chars  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  condenseText()    │  text > 3000 chars?
│                    │  → split 700-char chunks (Thai ≈ 450 tok)
│                    │  → Promise.all(summarize chunks × 3)
│                    │  → merge → slice 3000 chars
└────────┬───────────┘
         │ ~3000 chars
         ▼
┌──────────────────────────────────────────────────────────────┐
│                     Promise.all (parallel)                    │
│                                                              │
│  summarize()    generateQ("flappy")   generateQ("racer")     │
│  → 6-8 bullets  → 10 MCQ             → 10 MCQ               │
│                                                              │
│  generateQ("shooter")  generateQ("snake")  generateQ("bricks")│
│  → 10 MCQ              → 10 MCQ            → 10 MCQ           │
└──────────────────────────────────────────────────────────────┘
         │ ~25-40s total (parallel, not ~90s sequential)
         ▼
┌────────────────────┐
│  JSON response     │  questions, allGameQuestions,
│                    │  summary, extractedText
└────────────────────┘
```

### Text Cleaning Strategy

| Format | Cleaner | What it removes |
|--------|---------|----------------|
| PDF | `cleanPdf()` | Page numbers, repeated headers/footers (frequency-based), TOC dots, separator lines, fragments < 4 chars |
| DOCX | `cleanDocx()` | Normalizes bullet chars (•●▪ → -), collapses whitespace |
| TXT | `cleanTxt()` | URLs, encoding artifacts |
| YouTube | `cleanTranscript()` | `[Music]` `[Applause]` tags, merges fragments |

### Typhoon API — Key Difference

> **`max_tokens` = TOTAL tokens (prompt + completion)**  
> Unlike OpenAI where `max_tokens` = output only.  
> All calls use `max_tokens: 4096` as total budget.  
> `condenseText()` ensures input stays ≤ 2000 tokens before generation.

---

## Real-time Battle (PartyKit)

```
Host browser          PartyKit Server          Player browser(s)
     │                 party/game.ts                 │
     │──── join (host) ──────────────►               │
     │◄─── state: LOBBY ─────────────                │
     │                                               │
     │                                ──── join ───►│
     │◄──────────────── state: LOBBY (players: [...])│
     │                                               │
     │──── start ────────────────────►               │
     │◄───────────────── state: QUESTION (q0) ──────►│
     │                                               │
     │                                ─── answer ──►│
     │◄───── score update ─────────────────────────►│
     │                                               │
     │  ... 10 rounds ...                            │
     │◄───────────────── state: RESULTS ────────────►│
```

**State machine:** `LOBBY → QUESTION → REVEAL → (loop) → RESULTS`  
**Transport:** WebSocket (PartyKit Cloud)  
**Room capacity:** 10 concurrent players

---

## Frontend State Management

```
questions-context (React Context + useState)
│
├── sources: Source[]
│   ├── id, name, status (loading|ready|error)
│   ├── questions, gameQuestions, text, summary
│   └── selected: boolean
│
├── Derived (useMemo from selected+ready sources)
│   ├── questions[]         — merged from all selected
│   ├── gameQuestions{}     — per game type merged
│   ├── uploadedText        — first selected source
│   └── hasQuestions
│
├── use-scores (Supabase when logged in, localStorage fallback)
├── use-streak (localStorage — currentStreak, longestStreak, lastPlayDate)
└── use-exams  (localStorage — exam dates for planner)
```

---

## Auth Flow

```
NextAuth v5 (Edge-safe config in auth.config.ts, Node.js in auth.ts)
│
├── Google OAuth → Google accounts (นิสิต KU มี Google account อยู่แล้ว)
└── Credentials  → app_users table (PBKDF2 hash, salt per user)

Protected routes via middleware.ts:
  /arena/**  /quiz-battle/**  /flashcards  /planner
  → redirect to /login if no session
```

---

## ML Training Pipeline (KU Nontri AI Cluster)

```
Notebooks (local/Colab)          SLURM Cluster (br2.paas.ku.ac.th)
                                 GPU: A100 MIG 3g.40gb
01_dataset_gen.ipynb
  PDF → Typhoon API              04_finetune.ipynb → slurm_finetune.sh
  → MCQ × 5 game types            Base: typhoon2.5-qwen3-4b
  → ai/dataset/raw/               LoRA r=16 α=32 4-bit NF4
                                   unsloth + SFTTrainer
05_difficulty_rating.ipynb         EarlyStopping patience=3
  Teacher model rates 1/2/3      → merge LoRA adapter
  rebalance_dataset.py           → tar | split → 154×50MB chunks
  → ai/dataset/rated/              (NFS can't mmap large files)

                                 slurm_vllm.sh
                                   reassemble chunks → /tmp (local SSD)
                                   vLLM ≥0.8.0 serve port 8000

                                 start_tunnel.sh (screen session)
                                   SSH forward login→compute
                                   cloudflared tunnel → HTTPS URL
                                   curl Vercel API → update AI_BASE_URL
                                   trigger redeploy
```

### Why `/tmp` instead of NFS?

NFS on the cluster doesn't support `mmap` with large write operations (safetensors format) — causes `OSError: errno 71`.  
Solution: reassemble model to `/tmp` (node-local NVMe SSD) every job start. Persist via 154 × 50MB split chunks on NFS.

---

## Deployment Topology

```
User
 │ HTTPS
 ▼
Vercel (Edge Network)
 │
 ├── Static assets (CDN cached)
 ├── Next.js App Router (Node.js runtime)
 │    └── API Routes (maxDuration: 300s)
 │         └── fetch → Typhoon API / vLLM tunnel
 │
 └── WebSocket upgrade → PartyKit Cloud
      └── party/game.ts (Cloudflare Workers runtime)

Supabase (managed PostgreSQL)
 └── Row-level security disabled (service role for server, anon for client scores)
```

---

## File Size & Complexity Budget

| Component | Lines | Notes |
|-----------|-------|-------|
| `api/generate/route.ts` | ~420 | Core AI pipeline |
| `components/upload-dialog.tsx` | ~410 | NotebookLM-style source panel |
| `lib/questions-context.tsx` | ~130 | Multi-source state |
| `party/game.ts` | ~250 | WebSocket server |
| `components/*-game.tsx` × 5 | ~400–600 each | Canvas game engines |
| `ai/scripts/slurm_vllm.sh` | ~90 | vLLM cluster automation |
| `ai/scripts/start_tunnel.sh` | ~120 | Tunnel + Vercel auto-update |
