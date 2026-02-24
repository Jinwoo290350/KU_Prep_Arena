"""
run_eval.py — Evaluate all generated question sets in ai/dataset/generated/

Usage:
    python ai/eval/run_eval.py                      # eval all JSON files
    python ai/eval/run_eval.py --file notes.json    # eval one file
    python ai/eval/run_eval.py --out results.json   # custom output path
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

# Allow running from project root: python ai/eval/run_eval.py
sys.path.insert(0, str(Path(__file__).parent.parent))
from eval.metrics import evaluate  # noqa: E402


GENERATED_DIR = Path(__file__).parent.parent / "dataset" / "generated"
RESULTS_DIR   = Path(__file__).parent / "results"


def load_questions(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "questions" in data:
        return data["questions"]
    raise ValueError(f"Unexpected JSON format in {path}")


def eval_file(path: Path) -> dict:
    questions = load_questions(path)
    report = evaluate(questions)
    report["file"] = path.name
    report["game_type"] = questions[0].get("game_type", "?") if questions else "?"
    report["source_doc"] = questions[0].get("source_doc", path.stem) if questions else path.stem
    return report


def main():
    parser = argparse.ArgumentParser(description="Evaluate generated quiz question sets")
    parser.add_argument("--file", default=None, help="Single JSON file to evaluate (relative to dataset/generated/)")
    parser.add_argument("--out",  default=None, help="Output JSON path (default: eval/results/TIMESTAMP.json)")
    args = parser.parse_args()

    if args.file:
        targets = [GENERATED_DIR / args.file]
    else:
        targets = sorted(GENERATED_DIR.glob("*.json"))

    if not targets:
        print("No JSON files found in", GENERATED_DIR)
        sys.exit(0)

    reports = []
    for path in targets:
        if not path.exists():
            print(f"[SKIP] {path} not found")
            continue
        print(f"[eval] {path.name} …", end=" ")
        try:
            report = eval_file(path)
            status = "PASS ✓" if report.get("pass") else "FAIL ✗"
            print(f"{status}  (diversity={report['diversity_score']}, balance={report['balance_score']})")
        except Exception as e:
            report = {"file": path.name, "error": str(e), "pass": False}
            print(f"ERROR — {e}")
        reports.append(report)

    # Summary
    n_pass = sum(1 for r in reports if r.get("pass"))
    print(f"\n{'='*50}")
    print(f"Results: {n_pass}/{len(reports)} passed")

    # Save
    out_path = Path(args.out) if args.out else RESULTS_DIR / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps({"timestamp": datetime.now().isoformat(), "reports": reports},
                                    ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved → {out_path}")


if __name__ == "__main__":
    main()
