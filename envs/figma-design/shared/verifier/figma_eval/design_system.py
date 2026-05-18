from __future__ import annotations

import math
from typing import Any

from .edit_graph import EditGraph, is_metadata_only_change
from .tree import descendant_ids, find_node, is_instance_node
from .types import DesignCatalog, Envelope, SubCheckResult, TreeNode

NOVELTY_MAX_DISTANCE = 0.35


def _ds_result(
    ds_id: str, score: float, applicable: bool, details: dict[str, Any] | None = None
) -> SubCheckResult:
    return SubCheckResult(
        id=ds_id,
        category="design_system",
        score=score,
        applicable=applicable,
        weight=1.0,
        details=details,
    )


def _has_style_binding(node: TreeNode) -> bool:
    if is_instance_node(node):
        return True
    if node.get("textStyleId") or node.get("fillStyleId") or node.get("strokeStyleId"):
        return True
    if node.get("effectStyleId") or node.get("gridStyleId"):
        return True
    bv = node.get("boundVariables")
    if isinstance(bv, dict) and bv:
        return True
    for paint in (node.get("fills") or []) + (node.get("strokes") or []):
        if paint.get("type") == "VARIABLE_COLOR":
            return True
    return False


def _is_stylable(node: TreeNode) -> bool:
    if node.get("type") == "TEXT":
        return True
    if is_instance_node(node):
        return True
    if any(
        node.get(k)
        for k in ("fillStyleId", "strokeStyleId", "effectStyleId", "gridStyleId", "textStyleId")
    ):
        return True
    return bool((node.get("fills") or []) or (node.get("strokes") or []))


def _extract_solid_colors(node: TreeNode) -> list[dict[str, float]]:
    colors: list[dict[str, float]] = []
    for paint in (node.get("fills") or []) + (node.get("strokes") or []):
        if paint.get("type") == "SOLID":
            colors.append(paint["color"])
    if node.get("type") == "TEXT":
        for seg in node.get("styledSegments") or []:
            for paint in (seg.get("style") or {}).get("fills") or []:
                if paint.get("type") == "SOLID":
                    colors.append(paint["color"])
    return colors


def _color_distance(a: dict[str, float], b: dict[str, float]) -> float:
    return math.sqrt((a["r"] - b["r"]) ** 2 + (a["g"] - b["g"]) ** 2 + (a["b"] - b["b"]) ** 2)


def _novelty_score_for_color(color: dict[str, float], palette: list[dict[str, float]]) -> float:
    if not palette:
        return 1.0
    best = min(_color_distance(color, token) for token in palette)
    return max(0.0, 1.0 - best / NOVELTY_MAX_DISTANCE)


def collect_content_node_ids(graph: EditGraph, after: Envelope) -> set[str]:
    roots: set[str] = set()
    for change in graph.changes:
        if change.operation == "delete":
            continue
        if change.operation == "add":
            roots.add(change.node_id)
            continue
        if change.operation == "modify" and not is_metadata_only_change(change.changed_properties):
            roots.add(change.node_id)

    ids: set[str] = set()
    for root_id in roots:
        ids |= descendant_ids(after, root_id)
    return ids


def _parent_id_of(envelope: Envelope, node_id: str) -> str | None:
    found: str | None = None

    def walk(node: TreeNode, parent: TreeNode | None) -> None:
        nonlocal found
        if node.get("type") == "DOCUMENT":
            for ch in node.get("children") or []:
                walk(ch, node)
            return
        if node.get("id") == node_id and parent and parent.get("type") != "DOCUMENT":
            found = parent["id"]
            return
        for ch in node.get("children") or []:
            walk(ch, node)

    doc = envelope.get("document")
    if doc:
        walk(doc, None)
    return found


def _geometry_signature(node: TreeNode) -> str | None:
    if is_instance_node(node):
        return None
    if node.get("type") not in ("FRAME", "RECTANGLE", "GROUP"):
        return None
    w, h = node.get("width"), node.get("height")
    if isinstance(w, (int, float)) and isinstance(h, (int, float)):
        return f"{round(w)}x{round(h)}"
    return None


def run_design_system_checks(
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    catalog: DesignCatalog,
) -> list[SubCheckResult]:
    content_ids = collect_content_node_ids(graph, after)
    if not content_ids:
        reason = {"reason": "no_content_changes"}
        return [
            _ds_result("design_system.style_reuse", 1.0, False, reason),
            _ds_result("design_system.novelty", 1.0, False, reason),
            _ds_result("design_system.edited_regression", 1.0, False, reason),
            _ds_result("design_system.clone_cheat", 1.0, False, reason),
        ]

    # style_reuse
    catalog_applicable = (
        catalog.has_text_styles
        or catalog.paint_style_ids
        or catalog.effect_style_ids
        or catalog.grid_style_ids
        or catalog.has_variables
    )
    if not catalog_applicable:
        style_reuse = _ds_result("design_system.style_reuse", 1.0, False, {"reason": "no_design_tokens_in_file"})
    else:
        stylable = bound = 0
        for nid in content_ids:
            node = find_node(after, nid)
            if not node or not _is_stylable(node):
                continue
            stylable += 1
            if _has_style_binding(node):
                bound += 1
        if stylable == 0:
            style_reuse = _ds_result("design_system.style_reuse", 1.0, False, {"reason": "no_stylable_content_nodes"})
        else:
            style_reuse = _ds_result("design_system.style_reuse", bound / stylable, True, {"bound": bound, "stylable": stylable})

    # novelty
    if not catalog.colors:
        novelty = _ds_result("design_system.novelty", 1.0, False, {"reason": "no_catalog_colors"})
    else:
        colors: list[dict[str, float]] = []
        for nid in content_ids:
            node = find_node(after, nid)
            if node:
                colors.extend(_extract_solid_colors(node))
        if not colors:
            novelty = _ds_result("design_system.novelty", 1.0, False, {"reason": "no_solid_colors_in_content"})
        else:
            per = [_novelty_score_for_color(c, catalog.colors) for c in colors]
            score = sum(per) / len(per)
            novelty = _ds_result(
                "design_system.novelty",
                score,
                True,
                {"colors_checked": len(colors), "mean_novelty_penalty": 1.0 - score},
            )

    # edited_regression
    modified = [
        c.node_id
        for c in graph.changes
        if c.operation == "modify" and not is_metadata_only_change(c.changed_properties)
    ]
    if not modified:
        edited_regression = _ds_result(
            "design_system.edited_regression", 1.0, False, {"reason": "no_content_modifications"}
        )
    else:
        regressions = 0
        for nid in modified:
            b, a = find_node(before, nid), find_node(after, nid)
            if b and a and _has_style_binding(b) and not _has_style_binding(a):
                regressions += 1
        edited_regression = _ds_result(
            "design_system.edited_regression",
            1.0 - regressions / len(modified),
            True,
            {"regressions": regressions, "modified": len(modified)},
        )

    # clone_cheat
    if not catalog.has_components:
        clone_cheat = _ds_result("design_system.clone_cheat", 1.0, False, {"reason": "no_components_in_catalog"})
    elif not graph.added_ids:
        clone_cheat = _ds_result("design_system.clone_cheat", 1.0, False, {"reason": "no_added_nodes"})
    else:
        by_parent_sig: dict[str, int] = {}
        clone_candidates = 0
        for nid in graph.added_ids:
            node = find_node(after, nid)
            if not node:
                continue
            sig = _geometry_signature(node)
            if not sig:
                continue
            clone_candidates += 1
            parent_id = _parent_id_of(after, nid) or "root"
            key = f"{parent_id}:{sig}"
            by_parent_sig[key] = by_parent_sig.get(key, 0) + 1
        if clone_candidates == 0:
            clone_cheat = _ds_result("design_system.clone_cheat", 1.0, False, {"reason": "no_geometry_clones"})
        else:
            violations = sum(c for c in by_parent_sig.values() if c >= 2)
            score = max(0.0, 1.0 - violations / max(1, clone_candidates))
            clone_cheat = _ds_result(
                "design_system.clone_cheat",
                score,
                True,
                {
                    "duplicate_groups": sum(1 for c in by_parent_sig.values() if c >= 2),
                    "violations": violations,
                    "clone_candidates": clone_candidates,
                },
            )

    return [style_reuse, novelty, edited_regression, clone_cheat]
