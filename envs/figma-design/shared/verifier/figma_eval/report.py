from __future__ import annotations

from typing import Any

from .aggregator import _category_mean
from .log import log
from .types import SubCheckCategory, SubCheckResult

_CATEGORIES: tuple[SubCheckCategory, ...] = (
    "gates",
    "checks",
    "design_system",
    "visual",
    "heuristics",
)


def format_subcheck_entry(result: SubCheckResult) -> dict[str, Any]:
    entry: dict[str, Any] = {"id": result.id, "category": result.category}
    if result.applicable:
        entry["reward"] = result.score
        if result.details:
            entry["details"] = result.details
    else:
        entry["skipped"] = True
    return entry


def log_subcheck_results(results: list[SubCheckResult]) -> None:
    for result in results:
        if result.applicable:
            log(f"subcheck {result.id} reward={result.score:.4f}")
        else:
            log(f"subcheck {result.id} skipped")


def build_eval_details(
    *,
    score_0_10: float,
    completion_gate: float,
    raw: float,
    subchecks: list[SubCheckResult],
) -> dict[str, Any]:
    reward = max(0.0, min(1.0, score_0_10 / 10.0))
    categories: dict[str, Any] = {}

    for category in _CATEGORIES:
        items = [s for s in subchecks if s.category == category]
        if not items:
            continue
        cat_mean = _category_mean(items)
        cat_entry: dict[str, Any] = {
            "checks": [format_subcheck_entry(s) for s in items],
        }
        if cat_mean is not None:
            cat_entry["reward"] = cat_mean
        categories[category] = cat_entry

    return {
        "reward": reward,
        "score_0_10": score_0_10,
        "completion_gate": completion_gate,
        "raw": raw,
        "categories": categories,
        "checks": [format_subcheck_entry(s) for s in subchecks],
    }
