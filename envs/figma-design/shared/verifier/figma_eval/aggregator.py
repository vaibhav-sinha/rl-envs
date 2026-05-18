from __future__ import annotations

from typing import Any

from .types import DEFAULT_WEIGHTS, EvalReport, SubCheckResult


def _weighted_mean(items: list[SubCheckResult]) -> float:
    total = 0.0
    weight = 0.0
    for item in items:
        if not item.applicable:
            continue
        total += item.score * item.weight
        weight += item.weight
    return total / weight if weight > 0 else 1.0


def aggregate_scores(
    spec: dict[str, Any],
    subchecks: list[SubCheckResult],
    completion_gate: float,
) -> EvalReport:
    weights = {**DEFAULT_WEIGHTS, **(spec.get("weights") or {})}

    def by_category(cat: str) -> list[SubCheckResult]:
        return [s for s in subchecks if s.category == cat]

    category_scores: list[tuple[str, float, float]] = []

    gates_items = by_category("gates")
    if any(g.applicable for g in gates_items):
        category_scores.append(("gates", _weighted_mean(gates_items), weights["gates"]))

    checks_items = by_category("checks")
    if checks_items:
        category_scores.append(("checks", _weighted_mean(checks_items), weights["checks"]))

    ds_items = by_category("design_system")
    if any(d.applicable for d in ds_items):
        category_scores.append(
            ("design_system", _weighted_mean(ds_items), weights["design_system"])
        )

    visual_items = by_category("visual")
    if visual_items:
        category_scores.append(("visual", _weighted_mean(visual_items), weights["visual"]))

    heur_items = by_category("heuristics")
    if any(h.applicable for h in heur_items):
        category_scores.append(("heuristics", _weighted_mean(heur_items), weights["heuristics"]))

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
        if result and result.score < 1.0:
            gate = min(gate, 0.3)

    return gate
