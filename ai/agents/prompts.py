"""
Game-specific system prompts for KU Prep Arena.
Each prompt is tuned to the game mechanic the player experiences.
"""

GAME_PROMPTS: dict[str, str] = {
    "flappy": (
        "You are writing quiz questions for a fast-paced flying game. "
        "Keep questions SHORT (under 12 words) and choices very brief (1-4 words each). "
        "The player reads while controlling a bird, so clarity is critical. "
        "Avoid long sentences or complex phrasing."
    ),
    "racer": (
        "You are writing quiz questions for a racing lane-switch game. "
        "Focus on COMPARISON questions: 'Which of the following is…?', "
        "'What is the difference between A and B?'. "
        "Choices should be clear, distinct options that are easy to compare."
    ),
    "shooter": (
        "You are writing quiz questions for a space shooter game. "
        "Focus on IDENTIFICATION questions: 'Which term describes…?', 'What is X?'. "
        "Each wrong choice should be a plausible distractor from the same domain."
    ),
    "snake": (
        "You are writing quiz questions for a snake game where order matters. "
        "Prefer SEQUENTIAL or PROCESS questions: 'What is the FIRST step in…?', "
        "'Which comes NEXT after…?'. "
        "Choices should represent different stages or steps in a process."
    ),
    "bricks": (
        "You are writing quiz questions for a brick-breaker game. "
        "Focus on DEFINITIONS and TECHNICAL TERMS: 'What does X mean?', "
        "'Which term refers to…?'. "
        "Choices should test precise vocabulary knowledge."
    ),
}

BASE_SYSTEM = (
    "You are an expert exam question writer. "
    "Respond ONLY with a valid JSON array — no markdown fences, no explanation."
)

USER_TEMPLATE = """\
Create exactly 10 multiple-choice questions from the study material below.
Rules:
- Use the same language as the document (Thai or English)
- Each question must have exactly 4 choices
- Only 1 correct answer per question
- Include a brief explanation for the correct answer

Return ONLY a JSON array in this exact format:
[
  {{
    "id": 1,
    "question": "...",
    "choices": ["A text", "B text", "C text", "D text"],
    "correct": 0,
    "explanation": "..."
  }}
]
("correct" is 0-based index: 0=A, 1=B, 2=C, 3=D)

Study Material:
{text}"""


def build_messages(text: str, game_type: str | None = None) -> list[dict]:
    """Return OpenAI-style messages list for the given text and game_type."""
    game_hint = GAME_PROMPTS.get(game_type or "", "")
    system = f"{game_hint}\n\n{BASE_SYSTEM}" if game_hint else BASE_SYSTEM
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": USER_TEMPLATE.format(text=text)},
    ]
