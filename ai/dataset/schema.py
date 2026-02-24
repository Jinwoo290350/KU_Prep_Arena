"""
schema.py — QuizQuestion dataclass matching the TypeScript QuizQuestion interface.

TypeScript equivalent (src/lib/mock-data.ts):
  export interface QuizQuestion {
    id: number
    question: string
    choices: [string, string, string, string]
    correct: number   // 0-based index (0=A, 1=B, 2=C, 3=D)
    explanation: string
  }

Extended fields for the dataset (not sent to the web app):
  game_type  : str   — which game this question is optimised for
  source_doc : str   — original PDF filename
  difficulty : str   — "easy" | "medium" | "hard"
"""

from dataclasses import dataclass, field
from typing import Literal


GameType = Literal["flappy", "racer", "shooter", "snake", "bricks", "generic"]
Difficulty = Literal["easy", "medium", "hard"]


@dataclass
class QuizQuestion:
    id: int
    question: str
    choices: list[str]          # exactly 4 items
    correct: int                # 0-based index
    explanation: str
    game_type: GameType = "generic"
    source_doc: str = ""
    difficulty: Difficulty = "medium"

    def to_web_dict(self) -> dict:
        """Return only the fields the Next.js web app expects."""
        return {
            "id":          self.id,
            "question":    self.question,
            "choices":     self.choices,
            "correct":     self.correct,
            "explanation": self.explanation,
        }

    def to_full_dict(self) -> dict:
        return {
            "id":          self.id,
            "question":    self.question,
            "choices":     self.choices,
            "correct":     self.correct,
            "explanation": self.explanation,
            "game_type":   self.game_type,
            "source_doc":  self.source_doc,
            "difficulty":  self.difficulty,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "QuizQuestion":
        return cls(
            id=d.get("id", 0),
            question=d["question"],
            choices=d["choices"],
            correct=d["correct"],
            explanation=d.get("explanation", ""),
            game_type=d.get("game_type", "generic"),
            source_doc=d.get("source_doc", ""),
            difficulty=d.get("difficulty", "medium"),
        )
