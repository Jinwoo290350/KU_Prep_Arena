"""
metrics.py — Evaluation metrics for generated quiz questions.

Usage:
    from ai.eval.metrics import evaluate
    report = evaluate(questions, source_text)
"""

import json
import re
from collections import Counter
from typing import Sequence

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


LABELS = {0: "A", 1: "B", 2: "C", 3: "D"}


# ---------------------------------------------------------------------------
# 1. Answer Balance
# ---------------------------------------------------------------------------
def answer_balance(questions: Sequence[dict]) -> dict:
    """
    Check that A/B/C/D answers are distributed evenly.
    Ideal: 0.25 each.
    Returns per-label fraction.
    """
    counts = Counter(q["correct"] for q in questions)
    n = len(questions)
    return {LABELS.get(k, str(k)): round(v / n, 3) for k, v in sorted(counts.items())}


def answer_balance_score(questions: Sequence[dict]) -> float:
    """
    1.0 = perfectly even; 0.0 = all answers the same letter.
    Uses 1 - (max_fraction - 0.25) * 4 capped at 0.
    """
    bal = answer_balance(questions)
    max_frac = max(bal.values()) if bal else 1.0
    return round(max(0.0, 1.0 - (max_frac - 0.25) * 4), 3)


# ---------------------------------------------------------------------------
# 2. Question Diversity
# ---------------------------------------------------------------------------
def question_diversity(questions: Sequence[dict]) -> float:
    """
    Average pairwise cosine dissimilarity of question texts.
    Score: 1.0 = all questions completely different; 0.0 = all identical.
    """
    texts = [q["question"] for q in questions]
    if len(texts) < 2:
        return 1.0
    vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))
    try:
        mat = vec.fit_transform(texts)
    except ValueError:
        return 1.0
    sim_matrix = cosine_similarity(mat)
    # Upper triangle (excluding diagonal)
    n = len(texts)
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
    avg_sim = float(np.mean([sim_matrix[i, j] for i, j in pairs]))
    return round(1.0 - avg_sim, 3)


# ---------------------------------------------------------------------------
# 3. Relevance Score
# ---------------------------------------------------------------------------
def relevance_score(questions: Sequence[dict], source_text: str) -> float:
    """
    Average keyword overlap between each question+explanation and source text.
    Simple: Jaccard similarity of word sets (lower-cased, alpha tokens only).
    """
    src_tokens = set(re.findall(r"[a-z\u0e00-\u0e7f]+", source_text.lower()))
    if not src_tokens:
        return 0.0

    scores = []
    for q in questions:
        q_text = f"{q['question']} {q.get('explanation', '')}"
        q_tokens = set(re.findall(r"[a-z\u0e00-\u0e7f]+", q_text.lower()))
        if not q_tokens:
            scores.append(0.0)
            continue
        intersection = len(q_tokens & src_tokens)
        union = len(q_tokens | src_tokens)
        scores.append(intersection / union)

    return round(float(np.mean(scores)), 3)


# ---------------------------------------------------------------------------
# 4. Difficulty Spread (requires "difficulty" field in questions)
# ---------------------------------------------------------------------------
def difficulty_spread(questions: Sequence[dict]) -> dict:
    """
    Fraction of easy/medium/hard questions.
    Ideal: ~0.3 / 0.5 / 0.2.
    """
    counts = Counter(q.get("difficulty", "medium") for q in questions)
    n = len(questions)
    return {lvl: round(counts.get(lvl, 0) / n, 3) for lvl in ("easy", "medium", "hard")}


# ---------------------------------------------------------------------------
# 5. Format Validity
# ---------------------------------------------------------------------------
def format_validity(questions: Sequence[dict]) -> dict:
    """
    Check structural integrity: 4 choices, correct in 0-3, required fields.
    """
    total = len(questions)
    valid = 0
    issues = []
    for i, q in enumerate(questions):
        ok = True
        if not isinstance(q.get("choices"), list) or len(q["choices"]) != 4:
            issues.append(f"Q{i+1}: choices != 4")
            ok = False
        if q.get("correct") not in (0, 1, 2, 3):
            issues.append(f"Q{i+1}: correct out of range ({q.get('correct')})")
            ok = False
        for field in ("question", "explanation"):
            if not q.get(field):
                issues.append(f"Q{i+1}: missing {field}")
                ok = False
        if ok:
            valid += 1
    return {"valid": valid, "total": total, "pass_rate": round(valid / total, 3), "issues": issues}


# ---------------------------------------------------------------------------
# 6. Master evaluate()
# ---------------------------------------------------------------------------
def evaluate(questions: Sequence[dict], source_text: str = "") -> dict:
    """
    Run all metrics and return a single report dict.

    Args:
        questions:   List of question dicts (QuizQuestion.to_full_dict() format)
        source_text: Original extracted text from the PDF

    Returns:
        dict with keys: n_questions, answer_balance, balance_score,
                        diversity_score, relevance_score, difficulty_spread,
                        format_validity, pass
    """
    if not questions:
        return {"error": "No questions provided"}

    balance     = answer_balance(questions)
    balance_sc  = answer_balance_score(questions)
    diversity   = question_diversity(questions)
    relevance   = relevance_score(questions, source_text) if source_text else None
    diff_spread = difficulty_spread(questions)
    fmt         = format_validity(questions)

    # Overall pass: balance_score > 0.5, diversity > 0.6, format pass_rate = 1.0
    passed = (balance_sc > 0.5) and (diversity > 0.6) and (fmt["pass_rate"] == 1.0)

    return {
        "n_questions":      len(questions),
        "answer_balance":   balance,
        "balance_score":    balance_sc,
        "diversity_score":  diversity,
        "relevance_score":  relevance,
        "difficulty_spread": diff_spread,
        "format_validity":  fmt,
        "pass":             passed,
    }


if __name__ == "__main__":
    # Quick smoke test
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if path:
        with open(path, encoding="utf-8") as f:
            qs = json.load(f)
        report = evaluate(qs)
        print(json.dumps(report, ensure_ascii=False, indent=2))
