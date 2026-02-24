"""
test_endpoint.py — Smoke-test the vLLM (or Groq) endpoint.

Usage:
    python ai/scripts/test_endpoint.py
    python ai/scripts/test_endpoint.py --base-url http://br2.paas.ku.ac.th:8000/v1
"""

import argparse
import json
import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

DEFAULT_BASE_URL = os.getenv("AI_BASE_URL", "http://localhost:8000/v1")
DEFAULT_API_KEY  = os.getenv("AI_API_KEY", "none")
DEFAULT_MODEL    = os.getenv("AI_MODEL", "Qwen/Qwen2.5-14B-Instruct")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--api-key",  default=DEFAULT_API_KEY)
    parser.add_argument("--model",    default=DEFAULT_MODEL)
    args = parser.parse_args()

    client = OpenAI(base_url=args.base_url, api_key=args.api_key)

    # 1. List models
    print(f"[test] Connecting to {args.base_url} …")
    try:
        models = client.models.list()
        print(f"[test] Available models: {[m.id for m in models.data]}")
    except Exception as e:
        print(f"[FAIL] Could not list models: {e}", file=sys.stderr)
        sys.exit(1)

    # 2. Chat completion
    print(f"[test] Testing chat completion with model: {args.model}")
    prompt = (
        'Create 1 multiple-choice question about Python lists. '
        'Return ONLY a JSON object: {"question":"...","choices":["A","B","C","D"],"correct":0,"explanation":"..."}'
    )
    try:
        res = client.chat.completions.create(
            model=args.model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Respond with valid JSON only."},
                {"role": "user",   "content": prompt},
            ],
            max_tokens=512,
            temperature=0.3,
        )
        raw = res.choices[0].message.content or ""
        print(f"[test] Raw response:\n{raw}\n")
        obj = json.loads(raw)
        print(f"[PASS] Valid JSON question: {obj['question'][:80]}…")
    except json.JSONDecodeError:
        print("[WARN] Response was not valid JSON — model may need a stronger prompt")
    except Exception as e:
        print(f"[FAIL] Chat completion error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
