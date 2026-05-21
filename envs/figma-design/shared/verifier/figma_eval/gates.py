from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .edit_graph import EditGraph
from .tree import changes_inside_allowed_region, node_exists
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


def _has_change_outside_allowed_region(
    graph: EditGraph,
    before: Envelope,
    after: Envelope,
    root_ids: list[str],
) -> bool:
    inside = changes_inside_allowed_region(graph, before, after, root_ids)
    all_changes = graph.added_ids | graph.deleted_ids | graph.modified_ids
    return bool(all_changes - inside)


def _detached_node_count(issues_path: Path | None) -> int:
    if issues_path is None or not issues_path.is_file():
        return 0
    try:
        data = json.loads(issues_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return 0
    if not isinstance(data, dict):
        return 0
    detached = data.get("detached")
    return len(detached) if isinstance(detached, list) else 0


def run_gates(
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    gates: dict[str, Any] | None,
    *,
    issues_path: Path | None = None,
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

    if gates.get("no_detached_nodes"):
        count = _detached_node_count(issues_path)
        results.append(
            _gate_result(
                "gates.no_detached_nodes",
                1.0 if count == 0 else 0.0,
                {"detached_count": count, "issues_path": str(issues_path) if issues_path else None},
            )
        )

    return results
