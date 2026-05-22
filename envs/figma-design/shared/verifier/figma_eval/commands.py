from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .types import SubCheckResult

COMMAND_CORRECTNESS_CAP = 0.5


def _load_commands(issues_path: Path | None) -> list[dict[str, Any]] | None:
    if issues_path is None or not issues_path.is_file():
        return None
    try:
        data = json.loads(issues_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if not isinstance(data, dict):
        return None
    commands = data.get("commands")
    if not isinstance(commands, list) or len(commands) == 0:
        return None
    return [c for c in commands if isinstance(c, dict)]


def command_correctness_score(issues_path: Path | None) -> SubCheckResult:
    commands = _load_commands(issues_path)
    if not commands:
        return SubCheckResult(
            id="commands.command_correctness",
            category="commands",
            score=1.0,
            applicable=False,
            weight=1.0,
            details={"reason": "no_use_figma_commands_recorded"},
        )

    total = len(commands)
    success_count = sum(1 for c in commands if c.get("success") is True)
    failure_count = total - success_count
    raw = success_count / total
    score = min(raw, COMMAND_CORRECTNESS_CAP) if failure_count > 0 else raw
    capped = failure_count > 0 and raw > COMMAND_CORRECTNESS_CAP

    return SubCheckResult(
        id="commands.command_correctness",
        category="commands",
        score=score,
        applicable=True,
        weight=1.0,
        details={
            "success_count": success_count,
            "total": total,
            "failure_count": failure_count,
            "raw": raw,
            "capped": capped,
            "issues_path": str(issues_path) if issues_path else None,
        },
    )


def run_command_checks(*, issues_path: Path | None) -> list[SubCheckResult]:
    return [command_correctness_score(issues_path)]
