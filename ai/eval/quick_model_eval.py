"""
quick_model_eval.py — Run a quick evaluation of the merged model.

Usage:
    python ai/eval/quick_model_eval.py
    python ai/eval/quick_model_eval.py --game flappy --text "..."
    python ai/eval/quick_model_eval.py --rated   # eval rated dataset (no inference)
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

MODEL_PATH = Path(__file__).parent.parent / "agents" / "ku_typhoon_v1_merged" / "ku_typhoon_v1_merged"
RATED_DIR  = Path(__file__).parent.parent / "dataset" / "rated"

SAMPLE_TEXT = """\
ฟังก์ชัน (Function) คือกลุ่มของคำสั่งที่ทำงานร่วมกันเพื่อทำงานบางอย่าง
ใน Python ใช้ keyword def เพื่อนิยามฟังก์ชัน
ฟังก์ชันสามารถรับ argument และ return ค่ากลับได้
Scope คือขอบเขตของตัวแปร — local scope อยู่ภายในฟังก์ชัน, global scope อยู่นอกฟังก์ชัน
Lambda function คือฟังก์ชันสั้นๆ แบบ anonymous เขียนในบรรทัดเดียว
List comprehension ช่วยสร้าง list จาก iterable ด้วย syntax กระชับ
Dictionary ใช้เก็บข้อมูล key-value pair เข้าถึงด้วย key
Exception handling ใช้ try/except เพื่อจัดการ error ที่เกิดขึ้น
Class และ Object เป็นพื้นฐานของ OOP — class คือ blueprint, object คือ instance
Inheritance ทำให้ subclass รับ attribute และ method มาจาก parent class
"""


# ---------------------------------------------------------------------------
# Inference with local model
# ---------------------------------------------------------------------------
def load_model(model_path: Path):
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"[model] Loading from {model_path.name} on {device} …")

    tok = AutoTokenizer.from_pretrained(str(model_path), trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        str(model_path),
        torch_dtype=torch.bfloat16,
        device_map=device,
        trust_remote_code=True,
    )
    model.eval()
    print(f"[model] Loaded ✓  ({sum(p.numel() for p in model.parameters())/1e9:.1f}B params)")
    return tok, model, device


GAME_HINTS = {
    "flappy":  "Keep questions SHORT (under 12 words) and choices very brief (1-4 words each).",
    "racer":   "Focus on COMPARISON questions: 'Which of the following is…?', 'What is the difference between A and B?'.",
    "shooter": "Focus on IDENTIFICATION questions: 'Which term describes…?', 'What is X?'. Each wrong choice should be a plausible distractor.",
    "snake":   "Prefer SEQUENTIAL or PROCESS questions: 'What is the FIRST step in…?', 'Which comes NEXT after…?'.",
    "bricks":  "Focus on DEFINITIONS and TECHNICAL TERMS: 'What does X mean?', 'Which term refers to…?'.",
}

USER_TEMPLATE = (
    "Create exactly 10 multiple-choice questions from the study material below.\n"
    "Rules:\n"
    "- Use the same language as the document (Thai or English)\n"
    "- Each question must have exactly 4 choices\n"
    "- Only 1 correct answer per question\n"
    "- Include a brief explanation for the correct answer\n\n"
    "Return ONLY a JSON array in this exact format:\n"
    '[\n  {{\n    "id": 1,\n    "question": "...",\n    "choices": ["A text", "B text", "C text", "D text"],\n'
    '    "correct": 0,\n    "explanation": "..."\n  }}\n]\n'
    '("correct" is 0-based index: 0=A, 1=B, 2=C, 3=D)\n\n'
    "Study Material:\n{text}"
)

def _build_messages(text, game_type):
    hint = GAME_HINTS.get(game_type or "", "")
    base = "You are an expert exam question writer. Respond ONLY with a valid JSON array — no markdown fences, no explanation."
    system = (hint + "\n\n" + base) if hint else base
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": USER_TEMPLATE.format(text=text)},
    ]


def generate_questions(tok, model, device, text: str, game_type: str) -> list[dict]:
    import torch

    messages = _build_messages(text, game_type)

    # Qwen3 chat template
    input_text = tok.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False,   # Qwen3 non-thinking mode
    )
    inputs = tok(input_text, return_tensors="pt").to(device)

    print(f"[gen] Generating questions for game_type={game_type} …")
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=2048,
            temperature=0.5,
            do_sample=True,
            pad_token_id=tok.eos_token_id,
        )

    decoded = tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)

    # Strip markdown fences
    cleaned = re.sub(r"^```[a-z]*\n?", "", decoded.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\n?```$", "", cleaned, flags=re.IGNORECASE).strip()
    # Remove raw control characters (tab/newline inside JSON strings)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", cleaned)

    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try extracting JSON array from output
        m = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if m:
            questions = json.loads(m.group(0))
        else:
            raise
    for i, q in enumerate(questions):
        q["game_type"] = game_type
        q.setdefault("id", i + 1)
    return questions


# ---------------------------------------------------------------------------
# Eval on rated dataset (no inference)
# ---------------------------------------------------------------------------
def eval_rated():
    from eval.metrics import evaluate

    all_reports = []
    for path in sorted(RATED_DIR.glob("*.json")):
        with open(path, encoding="utf-8") as f:
            qs = json.load(f)
        if not isinstance(qs, list):
            qs = qs.get("questions", [])
        report = evaluate(qs)
        report["file"] = path.name
        report["game_type"] = qs[0].get("game_type", "?") if qs else "?"
        report["n"] = len(qs)
        all_reports.append(report)

    print_summary(all_reports)
    return all_reports


# ---------------------------------------------------------------------------
# Pretty print
# ---------------------------------------------------------------------------
def print_report(report: dict, label: str = ""):
    fmt = report.get("format_validity", {})
    diff = report.get("difficulty_spread", {})
    bal = report.get("answer_balance", {})
    status = "PASS ✓" if report.get("pass") else "FAIL ✗"

    print(f"\n{'='*55}")
    if label:
        print(f"  {label}")
    print(f"  Status        : {status}")
    print(f"  Questions     : {report.get('n_questions', report.get('n', '?'))}")
    print(f"  Format valid  : {fmt.get('valid',0)}/{fmt.get('total',0)}  ({fmt.get('pass_rate',0):.0%})")
    print(f"  Diversity     : {report.get('diversity_score', '?'):.3f}  (>0.6 to pass)")
    print(f"  Balance       : {report.get('balance_score', '?'):.3f}  (>0.5 to pass)")
    print(f"  Answer dist   : {bal}")
    print(f"  Difficulty    : easy={diff.get('easy',0):.0%}  med={diff.get('medium',0):.0%}  hard={diff.get('hard',0):.0%}")
    if fmt.get("issues"):
        print(f"  Issues        : {fmt['issues'][:3]}")
    print(f"{'='*55}")


def print_summary(reports: list[dict]):
    n_pass = sum(1 for r in reports if r.get("pass"))
    avg_div = sum(r.get("diversity_score", 0) for r in reports) / len(reports)
    avg_bal = sum(r.get("balance_score", 0) for r in reports) / len(reports)
    avg_fmt = sum(r.get("format_validity", {}).get("pass_rate", 0) for r in reports) / len(reports)

    print(f"\n{'='*55}")
    print(f"  SUMMARY — {n_pass}/{len(reports)} datasets PASS")
    print(f"  Avg diversity : {avg_div:.3f}")
    print(f"  Avg balance   : {avg_bal:.3f}")
    print(f"  Avg format    : {avg_fmt:.0%}")
    print(f"{'='*55}\n")

    for r in reports:
        status = "✓" if r.get("pass") else "✗"
        print(f"  {status}  {r.get('game_type','?'):8s}  "
              f"div={r.get('diversity_score',0):.3f}  "
              f"bal={r.get('balance_score',0):.3f}  "
              f"fmt={r.get('format_validity',{}).get('pass_rate',0):.0%}  "
              f"{r.get('file','')}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rated", action="store_true", help="Eval rated dataset only (no inference)")
    parser.add_argument("--game", default="flappy",
                        choices=["flappy", "racer", "shooter", "snake", "bricks"])
    parser.add_argument("--text", default=None, help="Custom study text")
    parser.add_argument("--all-games", action="store_true", help="Eval all 5 game types")
    args = parser.parse_args()

    from eval.metrics import evaluate

    if args.rated:
        print("[mode] Evaluating rated dataset (no inference)")
        eval_rated()
        return

    # --- Model inference eval ---
    text = args.text or SAMPLE_TEXT
    tok, model, device = load_model(MODEL_PATH)

    games = ["flappy", "racer", "shooter", "snake", "bricks"] if args.all_games else [args.game]
    reports = []

    for game in games:
        try:
            qs = generate_questions(tok, model, device, text, game)
            report = evaluate(qs)
            report["game_type"] = game
            report["n_questions"] = len(qs)
            reports.append(report)
            print_report(report, label=f"game_type={game}")

            # Save output
            out = Path(__file__).parent / "results" / f"ku_typhoon_v1_{game}.json"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps({"game_type": game, "questions": qs, "eval": report},
                                       ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  Saved → {out}")

        except Exception as e:
            print(f"[ERROR] game={game}: {e}")
            import traceback; traceback.print_exc()

    if len(reports) > 1:
        print_summary(reports)


if __name__ == "__main__":
    main()
