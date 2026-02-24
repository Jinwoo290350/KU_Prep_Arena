# KU Prep Arena — AI Section

Python/Jupyter workspace for generating and evaluating game-specific quiz questions using **Qwen2.5** on the **KU Nontri A100** server.

> Computational resources supported by KU Nontri AI, Kasetsart University.

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r ai/requirements.txt

# 2. Copy env template and fill in values
cp .env.local .env          # or create ai/.env

# 3. Start vLLM on A100
ssh aip04@br2.paas.ku.ac.th
bash ai/scripts/setup_vllm.sh

# 4. Test the endpoint (from local machine)
python ai/scripts/test_endpoint.py --base-url http://br2.paas.ku.ac.th:8000/v1

# 5. Generate questions for a PDF
python ai/agents/generate.py \
    --pdf ai/dataset/sample_pdfs/notes.pdf \
    --game flappy \
    --out ai/dataset/generated/notes_flappy.json

# 6. Run evaluation
python ai/eval/run_eval.py
```

---

## Folder Structure

```
ai/
├── README.md                   # This file
├── requirements.txt            # Python dependencies
│
├── agents/
│   ├── prompts.py              # Game-specific system prompts
│   └── generate.py             # CLI: PDF → questions via vLLM
│
├── dataset/
│   ├── schema.py               # QuizQuestion dataclass (matches TS interface)
│   ├── sample_pdfs/            # Place your source PDFs here
│   └── generated/              # Output: JSON question sets
│
├── eval/
│   ├── metrics.py              # Evaluation functions
│   ├── run_eval.py             # Batch evaluation runner
│   └── results/                # JSON + PNG eval reports
│
├── notebooks/
│   ├── 01_dataset_gen.ipynb    # PDF → dataset (all 5 game types)
│   ├── 02_game_agents.ipynb    # Compare prompts per game
│   └── 03_evaluation.ipynb     # Metrics dashboard + charts
│
└── scripts/
    ├── setup_vllm.sh           # Start Qwen2.5 on A100
    └── test_endpoint.py        # Smoke-test the API
```

---

## Game-Specific Prompts

| Game | Focus | Question Style |
|------|-------|----------------|
| `flappy` | Short answers | ≤ 12-word questions, 1-4 word choices |
| `racer` | Comparison | "Which of the following is…?" |
| `shooter` | Identification | "Which term describes…?" |
| `snake` | Sequential | "What is the FIRST step in…?" |
| `bricks` | Definitions | "What does X mean?" |

---

## Environment Variables

```env
# .env.local (Next.js web app)  OR  .env (Python scripts)
AI_BASE_URL=http://br2.paas.ku.ac.th:8000/v1   # A100 vLLM
AI_API_KEY=none
AI_MODEL=Qwen/Qwen2.5-14B-Instruct
```

---

## Evaluation Metrics

| Metric | Description | Pass threshold |
|--------|-------------|----------------|
| `balance_score` | A/B/C/D answer distribution evenness | > 0.5 |
| `diversity_score` | Pairwise question dissimilarity (TF-IDF) | > 0.6 |
| `relevance_score` | Keyword overlap with source text | informational |
| `format_validity.pass_rate` | All 4 choices, correct in 0-3 | 1.0 |

---

## Model Selection (A100, 40 GB VRAM)

| Model | VRAM | Thai support | Recommended |
|-------|------|-------------|-------------|
| `Qwen2.5-14B-Instruct` | ~28 GB | Good | **Default** |
| `Qwen2.5-72B-Instruct` (GPTQ 4-bit) | ~36 GB | Excellent | If VRAM allows |
