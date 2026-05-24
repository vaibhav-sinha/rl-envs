from __future__ import annotations

from typing import Any

from .edit_graph import EditGraph, is_metadata_only_change
from .novelty import resolve_allowed_roles
from .tokens import AUTO_LAYOUT_MODES, TokenRole, extract_node_tokens, value_to_display
from .tree import descendant_ids, find_node, is_instance_node
from .types import CanonicalValue, DesignCatalog, Envelope, SubCheckResult, TreeNode


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
    if bool((node.get("fills") or []) or (node.get("strokes") or [])):
        return True
    if node.get("layoutMode") in AUTO_LAYOUT_MODES:
        return True
    return bool(node.get("layoutGrids"))


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


def _check_token_adherence(
    after: Envelope,
    content_ids: set[str],
    catalog: DesignCatalog,
    allowed_roles: set[str],
) -> SubCheckResult:
    if not catalog.has_allowlists:
        return _ds_result(
            "design_system.token_adherence",
            1.0,
            False,
            {"reason": "no_observed_tokens_in_baseline"},
        )

    violations = 0
    checked = 0
    by_role: dict[str, int] = {}
    samples: list[dict[str, str]] = []

    for nid in content_ids:
        node = find_node(after, nid)
        if not node:
            continue
        for role, value in extract_node_tokens(node, after):
            role_key = role.value
            if role_key in allowed_roles:
                continue
            allowlist = catalog.allowlists.get(role_key)
            if not allowlist:
                continue
            checked += 1
            if value not in allowlist:
                violations += 1
                by_role[role_key] = by_role.get(role_key, 0) + 1
                if len(samples) < 8:
                    samples.append(
                        {
                            "node_id": nid,
                            "role": role_key,
                            "value": value_to_display(value),
                        }
                    )

    if checked == 0:
        reason = (
            "all_roles_novelty_allowed"
            if allowed_roles
            else "no_enforceable_tokens_in_content"
        )
        return _ds_result(
            "design_system.token_adherence",
            1.0,
            False,
            {"reason": reason, "allowed_roles": sorted(allowed_roles)},
        )

    score = 1.0 - violations / checked
    return _ds_result(
        "design_system.token_adherence",
        score,
        True,
        {
            "tokens_checked": checked,
            "violations": violations,
            "violations_by_role": by_role,
            "sample_violations": samples,
            "allowed_roles": sorted(allowed_roles),
        },
    )


def _value_bindable(role: TokenRole, value: CanonicalValue, catalog: DesignCatalog) -> bool:
    bindable = catalog.bindable_by_role.get(role.value)
    if not bindable:
        return False
    return value in bindable


def _check_style_variable_reuse(
    after: Envelope,
    content_ids: set[str],
    catalog: DesignCatalog,
) -> SubCheckResult:
    if not catalog.has_bindable_tokens:
        return _ds_result(
            "design_system.style_variable_reuse",
            1.0,
            False,
            {"reason": "no_bindable_styles_or_variables"},
        )

    missed = 0
    checked = 0
    samples: list[dict[str, str]] = []

    for nid in content_ids:
        node = find_node(after, nid)
        if not node or not _is_stylable(node) or _has_style_binding(node):
            continue
        for role, value in extract_node_tokens(node, after):
            if not _value_bindable(role, value, catalog):
                continue
            checked += 1
            missed += 1
            if len(samples) < 8:
                samples.append(
                    {
                        "node_id": nid,
                        "role": role.value,
                        "value": value_to_display(value),
                    }
                )

    if checked == 0:
        return _ds_result(
            "design_system.style_variable_reuse",
            1.0,
            False,
            {"reason": "no_unbound_bindable_slots"},
        )

    score = 1.0 - missed / checked
    return _ds_result(
        "design_system.style_variable_reuse",
        score,
        True,
        {
            "bindable_slots_checked": checked,
            "missed_bindings": missed,
            "sample_missed": samples,
        },
    )


def _check_edited_regression(
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
) -> SubCheckResult:
    modified = [
        c.node_id
        for c in graph.changes
        if c.operation == "modify" and not is_metadata_only_change(c.changed_properties)
    ]
    if not modified:
        return _ds_result(
            "design_system.edited_regression",
            1.0,
            False,
            {"reason": "no_content_modifications"},
        )

    regressions = 0
    for nid in modified:
        b, a = find_node(before, nid), find_node(after, nid)
        if b and a and _has_style_binding(b) and not _has_style_binding(a):
            regressions += 1

    return _ds_result(
        "design_system.edited_regression",
        1.0 - regressions / len(modified),
        True,
        {"regressions": regressions, "modified": len(modified)},
    )


def run_design_system_checks(
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    catalog: DesignCatalog,
    ds_spec: dict[str, Any] | None = None,
) -> list[SubCheckResult]:
    content_ids = collect_content_node_ids(graph, after)
    allowed_roles = resolve_allowed_roles(ds_spec)

    if not content_ids:
        reason = {"reason": "no_content_changes"}
        return [
            _ds_result("design_system.token_adherence", 1.0, False, reason),
            _ds_result("design_system.style_variable_reuse", 1.0, False, reason),
            _ds_result("design_system.edited_regression", 1.0, False, reason),
        ]

    token_adherence = _check_token_adherence(after, content_ids, catalog, allowed_roles)
    style_reuse = _check_style_variable_reuse(after, content_ids, catalog)
    edited_regression = _check_edited_regression(before, after, graph)

    return [token_adherence, style_reuse, edited_regression]
