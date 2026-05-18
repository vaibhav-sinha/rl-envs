from __future__ import annotations

from typing import Any

from .edit_graph import EditGraph
from .tree import descendant_ids, is_node_under_roots, node_exists
from .types import Envelope, SubCheckResult


def _gate_result(gate_id: str, score: float, details: dict[str, Any] | None = None) -> SubCheckResult:
    return SubCheckResult(
        id=gate_id,
        category="gates",
        score=score,
        applicable=True,
        weight=1.0,
        details=details,
    )


def _allowed_before_scope(before: Envelope, root_ids: list[str]) -> set[str]:
    allowed: set[str] = set()
    for root_id in root_ids:
        allowed |= descendant_ids(before, root_id)
    return allowed


def _has_change_outside_allowed_region(
    graph: EditGraph,
    before: Envelope,
    after: Envelope,
    root_ids: list[str],
) -> bool:
    allowed_before = _allowed_before_scope(before, root_ids)

    for nid in graph.added_ids:
        if not is_node_under_roots(after, nid, root_ids):
            return True

    for nid in graph.modified_ids:
        if nid not in allowed_before or not is_node_under_roots(after, nid, root_ids):
            return True

    for nid in graph.deleted_ids:
        if nid not in allowed_before:
            return True

    return False


def run_gates(
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    gates: dict[str, Any] | None,
) -> list[SubCheckResult]:
    if not gates:
        return []

    results: list[SubCheckResult] = []

    if gates.get("require_change"):
        results.append(
            _gate_result("gates.require_change", 0.0 if graph.equal else 1.0, {"equal": graph.equal})
        )

    for nid in gates.get("preserve_ids") or []:
        ok = node_exists(after, nid)
        results.append(_gate_result(f"gates.preserve.{nid}", 1.0 if ok else 0.0, {"node_id": nid}))

    allowed_inside = gates.get("allowed_change_inside_ids")
    if allowed_inside:
        outside = _has_change_outside_allowed_region(graph, before, after, allowed_inside)
        results.append(
            _gate_result(
                "gates.allowed_change_inside",
                0.0 if outside else 1.0,
                {"allowed_roots": allowed_inside},
            )
        )

    if gates.get("additions_only"):
        ok = not graph.modified_ids and not graph.deleted_ids
        results.append(_gate_result("gates.additions_only", 1.0 if ok else 0.0))

    return results
