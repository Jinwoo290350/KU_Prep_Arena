#!/usr/bin/env python3
"""
rebalance_dataset.py
Rebalance answer distribution across all rated dataset files.

- Flappy (2-choice): randomize correct position → ~50% A, ~50% B
- Others (4-choice): stratified shuffle → A/B/C/D each ~25%
"""

import json
import random
import re
from pathlib import Path

DATASET_DIR = Path(__file__).parent.parent / "dataset" / "rated"


def strip_prefix(text: str) -> str:
    return re.sub(r'^[A-Da-d][).]\s*', '', text).strip()


def rebalance_flappy(data: list) -> list:
    """For 2-choice files: randomize correct position using question id as seed."""
    for q in data:
        choices = q.get("choices", [])
        correct = int(q.get("correct", 1))
        if len(choices) != 2:
            continue

        # Extract plain texts
        plain = [strip_prefix(c) for c in choices]
        correct_text = plain[correct]
        wrong_text   = plain[1 - correct]

        # Randomize position (deterministic per question id)
        rng = random.Random(q.get("id", 0))
        if rng.random() < 0.5:
            new_plain   = [wrong_text, correct_text]
            new_correct = 1
        else:
            new_plain   = [correct_text, wrong_text]
            new_correct = 0

        q["choices"] = [f"A. {new_plain[0]}", f"B. {new_plain[1]}"]
        q["correct"] = new_correct
    return data


def rebalance_4choice(data: list) -> list:
    """
    For 4-choice files: rotate answers so correct index cycles evenly
    across 0/1/2/3 using stratified assignment.
    Preserves which answer is actually correct — just rotates all 4 choices.
    """
    labels = ["A", "B", "C", "D"]
    target_cycle = [0, 1, 2, 3] * (len(data) // 4 + 1)

    for i, q in enumerate(data):
        choices = q.get("choices", [])
        correct = int(q.get("correct", 0))
        if len(choices) != 4:
            continue

        plain = [strip_prefix(c) for c in choices]
        current_correct_text = plain[correct]

        # How many positions to rotate so correct lands on target slot
        target_slot = target_cycle[i]
        shift = (target_slot - correct) % 4

        # Rotate choices array by shift
        rotated = plain[len(plain)-shift:] + plain[:len(plain)-shift]

        q["choices"] = [f"{labels[j]}. {rotated[j]}" for j in range(4)]
        # Find where correct_text ended up
        q["correct"] = rotated.index(current_correct_text)

    return data


def process_file(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    game_type = data[0].get("game_type", "") if data else ""

    before = [q["correct"] for q in data]

    if "flappy" in path.name:
        data = rebalance_flappy(data)
    else:
        data = rebalance_4choice(data)

    after = [q["correct"] for q in data]

    # Count distribution
    from collections import Counter
    dist = Counter(after)
    n = len(after)
    balance = min(dist.values()) / (n / len(dist)) if dist else 0

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"file": path.name, "n": n, "dist": dict(sorted(dist.items())), "balance": round(balance, 3)}


def main():
    files = sorted(DATASET_DIR.glob("*.json"))
    if not files:
        print(f"No JSON files in {DATASET_DIR}")
        return

    print(f"Rebalancing {len(files)} files in {DATASET_DIR}\n")
    for f in files:
        result = process_file(f)
        print(f"  {result['file']}")
        print(f"    dist={result['dist']}  balance={result['balance']}")

    print("\nDone.")


if __name__ == "__main__":
    main()
