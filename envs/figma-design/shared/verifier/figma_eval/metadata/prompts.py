from __future__ import annotations


def build_diff_prompt(*, task_instruction: str, diff_summary: str) -> str:
    return (
        "You are evaluating whether an agent completed a Figma design task.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Design diff (no screenshots)\n"
        f"{diff_summary}\n\n"
        "Judge whether the diff shows the task was completed. "
        "Return a single score from 0-10 (0=not done, 10=fully done).\n\n"
        "Provide a brief explanation (1-2 sentences) justifying the score.\n\n"
        "Respond with JSON only:\n"
        "{\n"
        '  "score": 0-10,\n'
        '  "explanation": "..."\n'
        "}\n"
        "Do not include markdown fences."
    )
