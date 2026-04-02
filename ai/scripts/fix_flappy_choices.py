#!/usr/bin/env python3
"""
fix_flappy_choices.py
Reduce flappy game questions from 4 choices to 2 choices.

Rules:
- Keep the correct answer as-is
- Keep only ONE wrong answer (the first wrong one encountered)
- Update `correct` to 0 or 1 depending on where the correct answer ends up
- Reformat choices as ["A. <text>", "B. <text>"] (strip any existing A)/B)/C)/D) prefixes)
"""

import json
import random
import re
from pathlib import Path

DATASET_DIR = Path(__file__).parent.parent / "dataset" / "rated"


def strip_choice_prefix(text: str) -> str:
    """Strip leading 'A) ', 'B) ', 'C) ', 'D) ', 'A. ', 'B. ', etc. prefixes."""
    return re.sub(r'^[A-Da-d][).]\s*', '', text).strip()


def fix_flappy_file(path: Path) -> int:
    """Fix a single flappy JSON file. Returns number of questions modified."""
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = 0

    for q in data:
        raw_choices = q.get("choices", [])
        correct_idx = int(q.get("correct", 0))

        if len(raw_choices) != 4:
            print(f"  [SKIP] Q{q.get('id', '?')}: already has {len(raw_choices)} choices")
            continue

        # Strip any existing letter prefixes
        plain_choices = [strip_choice_prefix(c) for c in raw_choices]

        correct_text = plain_choices[correct_idx]

        # Collect wrong answers (all except the correct one)
        wrong_choices = [c for i, c in enumerate(plain_choices) if i != correct_idx]
        first_wrong = wrong_choices[0]  # keep only the first wrong answer

        # Randomize position so balance is ~50/50 across questions
        # Use question id as seed for reproducibility
        rng = random.Random(q.get("id", 0))
        if rng.random() < 0.5:
            new_choices_plain = [first_wrong, correct_text]
            new_correct = 1
        else:
            new_choices_plain = [correct_text, first_wrong]
            new_correct = 0

        # Format as "A. ..." / "B. ..."
        labels = ["A", "B"]
        new_choices = [f"{labels[i]}. {text}" for i, text in enumerate(new_choices_plain)]

        q["choices"] = new_choices
        q["correct"] = new_correct
        changed += 1

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return changed


def main():
    flappy_files = sorted(DATASET_DIR.glob("*_flappy.json"))

    if not flappy_files:
        print(f"No *_flappy.json files found in {DATASET_DIR}")
        return

    total_changed = 0
    for fpath in flappy_files:
        print(f"\nProcessing: {fpath.name}")
        n = fix_flappy_file(fpath)
        print(f"  → {n} questions updated to 2 choices")
        total_changed += n

        # Show first question as sample
        data = json.loads(fpath.read_text(encoding="utf-8"))
        q0 = data[0]
        print(f"  Sample Q1: choices={q0['choices']}, correct={q0['correct']}")

    print(f"\nDone. Total questions modified: {total_changed}")


if __name__ == "__main__":
    main()
