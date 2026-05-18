from __future__ import annotations

from typing import Any

from .types import DEFAULT_WEIGHTS, EvalReport, SubCheckResult


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


def _append_category(
    category_scores: list[tuple[str, float, float]],
    name: str,
    items: list[SubCheckResult],
    weight: float,
) -> None:
    mean = _category_mean(items)
    if mean is None:
        return
    category_scores.append((name, mean, weight))


def aggregate_scores(
    spec: dict[str, Any],
    subchecks: list[SubCheckResult],
    completion_gate: float,
) -> EvalReport:
    weights = {**DEFAULT_WEIGHTS, **(spec.get("weights") or {})}

    def by_category(cat: str) -> list[SubCheckResult]:
        return [s for s in subchecks if s.category == cat]

    category_scores: list[tuple[str, float, float]] = []

    _append_category(category_scores, "gates", by_category("gates"), weights["gates"])
    _append_category(category_scores, "checks", by_category("checks"), weights["checks"])
    _append_category(
        category_scores, "design_system", by_category("design_system"), weights["design_system"]
    )
    _append_category(category_scores, "visual", by_category("visual"), weights["visual"])
    _append_category(category_scores, "heuristics", by_category("heuristics"), weights["heuristics"])

    w_sum = sum(c[2] for c in category_scores)
    raw = sum(c[1] * c[2] for c in category_scores) / w_sum if w_sum > 0 else 0.0
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
