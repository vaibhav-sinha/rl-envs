from __future__ import annotations

from typing import Any

from .edit_graph import EditGraph
from .tree import descendant_ids, node_exists
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


def run_gates(
    _before: Envelope,
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

    for nid in gates.get("forbid_delete_ids") or []:
        deleted = nid in graph.deleted_ids
        results.append(
            _gate_result(f"gates.forbid_delete.{nid}", 0.0 if deleted else 1.0, {"node_id": nid})
        )

    max_outside = gates.get("max_change_outside_ids")
    if max_outside:
        allowed: set[str] = set()
        for root_id in max_outside:
            allowed |= descendant_ids(after, root_id)

        changed_outside: list[str] = []
        for nid in graph.added_ids:
            if nid not in allowed:
                changed_outside.append(nid)
        for nid in graph.modified_ids:
            if nid not in allowed:
                changed_outside.append(nid)
        for nid in graph.deleted_ids:
            if nid not in allowed:
                changed_outside.append(nid)

        total_changed = len(graph.added_ids) + len(graph.modified_ids) + len(graph.deleted_ids)
        outside = len(changed_outside)
        locality = 1.0 if total_changed == 0 else max(0.0, 1.0 - outside / total_changed)
        results.append(
            _gate_result(
                "gates.max_change_outside",
                locality,
                {"changed_outside": outside, "total_changed": total_changed},
            )
        )

    return results
