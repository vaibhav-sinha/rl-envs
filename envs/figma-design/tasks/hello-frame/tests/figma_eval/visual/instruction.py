from __future__ import annotations

from pathlib import Path


def load_task_instruction(instruction_path: str | Path) -> str:
    path = Path(instruction_path)
    if not path.is_file():
        raise FileNotFoundError(f"Instruction file not found: {path}")
    return path.read_text(encoding="utf-8").strip()
