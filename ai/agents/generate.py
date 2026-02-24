"""
generate.py — CLI script: PDF → game-specific questions via vLLM

Usage:
    python ai/agents/generate.py \
        --pdf ai/dataset/sample_pdfs/notes.pdf \
        --game flappy \
        --out ai/dataset/generated/notes_flappy.json

Requires vLLM server running (see ai/scripts/setup_vllm.sh).
"""

import argparse
import json
import re
import sys
from pathlib import Path

import pdfplumber
from openai import OpenAI
from dotenv import load_dotenv
import os

from prompts import build_messages  # relative import when run from ai/ folder

load_dotenv()

BASE_URL = os.getenv("AI_BASE_URL", "http://localhost:8000/v1")
API_KEY  = os.getenv("AI_API_KEY", "none")
MODEL    = os.getenv("AI_MODEL", "Qwen/Qwen2.5-14B-Instruct")


def extract_text(pdf_path: str, max_chars: int = 12_000) -> str:
    with pdfplumber.open(pdf_path) as pdf:
        pages = [p.extract_text() or "" for p in pdf.pages]
    return "\n".join(pages)[:max_chars]


def call_llm(text: str, game_type: str | None, client: OpenAI) -> list[dict]:
    messages = build_messages(text, game_type)
    res = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.5,
        max_tokens=2048,
    )
    raw = res.choices[0].message.content or "[]"
    # Strip markdown fences if present
    cleaned = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n?```$", "", cleaned, flags=re.IGNORECASE).strip()
    return json.loads(cleaned)


def main():
    parser = argparse.ArgumentParser(description="Generate quiz questions from a PDF")
    parser.add_argument("--pdf",  required=True, help="Path to PDF file")
    parser.add_argument("--game", default=None,
                        choices=["flappy", "racer", "shooter", "snake", "bricks"],
                        help="Game type (default: generic)")
    parser.add_argument("--out",  required=True, help="Output JSON file path")
    parser.add_argument("--base-url", default=BASE_URL)
    parser.add_argument("--model",    default=MODEL)
    args = parser.parse_args()

    client = OpenAI(base_url=args.base_url, api_key=API_KEY)

    print(f"[generate] Extracting text from {args.pdf}…")
    text = extract_text(args.pdf)
    if len(text.strip()) < 50:
        print("ERROR: Could not extract enough text from PDF.", file=sys.stderr)
        sys.exit(1)

    print(f"[generate] Generating {args.game or 'generic'} questions via {args.model}…")
    questions = call_llm(text, args.game, client)

    # Attach metadata
    for i, q in enumerate(questions):
        q["game_type"]   = args.game or "generic"
        q["source_doc"]  = Path(args.pdf).name
        q.setdefault("id", i + 1)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[generate] Saved {len(questions)} questions → {out_path}")


if __name__ == "__main__":
    main()
