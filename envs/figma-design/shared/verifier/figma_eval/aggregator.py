from __future__ import annotations

from typing import Any

from .types import (
    DEFAULT_CATEGORY_IMPORTANCE,
    SCORING_CATEGORIES,
    EvalReport,
    SubCheckResult,
)


def _category_mean(items: list[SubCheckResult]) -> float | None:
    """Weighted mean over applicable items, or None when none apply."""
    total = 0.0
    weight = 0.0
    for item in items:
        if not item.applicable:
            continue
        total += item.score * item.weight
        weight += item.weight
    if weight <= 0:
        return None
    return total / weight


def _resolve_category_importance(spec: dict[str, Any]) -> dict[str, float]:
    """Merge defaults with per-task overrides. Gates are not part of raw scoring."""
    legacy = spec.get("weights") or {}
    explicit = spec.get("category_importance") or {}
    merged = {**DEFAULT_CATEGORY_IMPORTANCE, **legacy, **explicit}
    merged.pop("gates", None)
    return {k: float(v) for k, v in merged.items() if isinstance(v, (int, float)) and v > 0}


def aggregate_scores(
    spec: dict[str, Any],
    subchecks: list[SubCheckResult],
    completion_gate: float,
) -> EvalReport:
    importance = _resolve_category_importance(spec)

    def by_category(cat: str) -> list[SubCheckResult]:
        return [s for s in subchecks if s.category == cat]

    category_scores: list[tuple[str, float, float]] = []

    for name in SCORING_CATEGORIES:
        items = by_category(name)
        mean = _category_mean(items)
        if mean is None:
            continue
        imp = importance.get(name, 0.0)
        if imp <= 0:
            continue
        category_scores.append((name, mean, imp))

    w_sum = sum(c[2] for c in category_scores)
    if w_sum <= 0:
        raw = 0.0
    else:
        raw = sum(c[1] * (c[2] / w_sum) for c in category_scores)

    score = max(0.0, min(10.0, completion_gate * raw * 10.0))

    return EvalReport(
        score=score,
        completion_gate=completion_gate,
        raw=raw,
        subchecks=subchecks,
    )


def compute_completion_gate(
    gate_results: list[SubCheckResult],
    check_results: list[SubCheckResult],
    spec: dict[str, Any],
) -> float:
    gate = 1.0

    for g in gate_results:
        if g.applicable and g.score < 1.0:
            gate = min(gate, 0.2)

    for c in spec.get("checks") or []:
        if c.get("required") is False:
            continue
        result = next((r for r in check_results if r.id == f"check.{c['id']}"), None)
        if result and result.applicable and result.score < 1.0:
            gate = min(gate, 0.3)

    return gate
