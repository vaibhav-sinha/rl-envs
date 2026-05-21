from __future__ import annotations

from typing import Any

from ..catalog import DesignCatalog, component_exists
from ..edit_graph import (
    EditGraph,
    added_ids_under,
    is_metadata_only_change,
    modified_ids_under,
)
from ..tree import (
    descendant_ids,
    find_all_nodes,
    find_node,
    get_main_component_id,
    get_node_property,
    is_instance_node,
    node_exists,
    resolve_config_node_id,
)
from ..types import Envelope, SubCheckResult, subcheck_weight_from_spec
from .scope import image_nodes_in_scope, resolve_check_scope, text_nodes_containing


def _check_result(
    spec: dict[str, Any],
    score: float,
    applicable: bool,
    details: dict[str, Any] | None = None,
) -> SubCheckResult:
    return SubCheckResult(
        id=f"check.{spec['id']}",
        category="checks",
        score=score,
        applicable=applicable,
        weight=subcheck_weight_from_spec(spec),
        details=details,
    )


def _run_min_added_under(spec: dict[str, Any], graph: EditGraph, after: Envelope) -> SubCheckResult:
    parent_id = spec["parent_id"]
    min_count = spec.get("min", 1)
    if not node_exists(after, parent_id):
        return _check_result(spec, 0.0, True, {"error": "parent_missing_in_after"})
    added = added_ids_under(graph, parent_id, after)
    score = min(1.0, len(added) / min_count)
    return _check_result(spec, score, True, {"count": len(added), "min": min_count, "added_ids": added})


def _run_min_modified_under(spec: dict[str, Any], graph: EditGraph, after: Envelope) -> SubCheckResult:
    parent_id = spec["parent_id"]
    min_count = spec.get("min", 1)
    if not node_exists(after, parent_id):
        return _check_result(spec, 0.0, True, {"error": "parent_missing_in_after"})
    modified = modified_ids_under(graph, parent_id, after)
    score = min(1.0, len(modified) / min_count)
    return _check_result(
        spec, score, True, {"count": len(modified), "min": min_count, "modified_ids": modified}
    )


def _count_component_instances_under(
    envelope: Envelope, scope_id: str, component_id: str
) -> int:
    scope = descendant_ids(envelope, scope_id)
    resolved_component = resolve_config_node_id(envelope, component_id)
    if not resolved_component:
        return 0
    count = 0
    for node in find_all_nodes(envelope):
        if node.get("id") not in scope:
            continue
        if is_instance_node(node) and get_main_component_id(node) == resolved_component:
            count += 1
    return count


def _run_component_instances_under(
    spec: dict[str, Any], after: Envelope, catalog: DesignCatalog
) -> SubCheckResult:
    scope_id = spec["scope_id"]
    component_id = spec["component_id"]
    min_instances = spec.get("min_instances", 1)

    if not component_exists(catalog, after, component_id):
        return _check_result(
            spec, 0.0, False, {"error": "component_not_in_catalog", "component_id": component_id}
        )
    if not node_exists(after, scope_id):
        return _check_result(spec, 0.0, True, {"error": "scope_missing_in_after"})

    count = _count_component_instances_under(after, scope_id, component_id)
    score = min(1.0, count / min_instances)
    return _check_result(
        spec,
        score,
        True,
        {"count": count, "min_instances": min_instances, "component_id": component_id},
    )


def _run_metadata_only_under(
    spec: dict[str, Any], graph: EditGraph, after: Envelope
) -> SubCheckResult:
    parent_id = spec["parent_id"]
    scope = descendant_ids(after, parent_id)
    violations = 0
    for change in graph.changes:
        if change.node_id not in scope:
            continue
        if change.operation in ("add", "delete"):
            violations += 1
            continue
        if change.operation == "modify" and not is_metadata_only_change(change.changed_properties):
            violations += 1
    score = 1.0 if violations == 0 else 0.0
    return _check_result(spec, score, True, {"violations": violations})


def _run_must_contain_text(
    spec: dict[str, Any], graph: EditGraph, after: Envelope
) -> SubCheckResult:
    scope_ids, err = resolve_check_scope(spec, graph, after)
    if err == "missing_node_id":
        return _check_result(spec, 0.0, False, {"error": err})
    if err == "unknown_scope":
        return _check_result(spec, 0.0, False, {"error": err})
    if err == "scope_missing_in_after":
        return _check_result(spec, 0.0, True, {"error": err})

    substring = spec["contains"]
    case_sensitive = spec.get("case_sensitive", False)
    matches = text_nodes_containing(
        after, scope_ids, substring, case_sensitive=case_sensitive
    )
    ok = len(matches) > 0
    return _check_result(
        spec,
        1.0 if ok else 0.0,
        True,
        {
            "contains": substring,
            "scope": spec.get("scope", "node_id"),
            "matched_node_ids": [n["id"] for n in matches if n.get("id")],
        },
    )


def _run_must_contain_image(
    spec: dict[str, Any], graph: EditGraph, after: Envelope
) -> SubCheckResult:
    scope_ids, err = resolve_check_scope(spec, graph, after)
    if err == "missing_node_id":
        return _check_result(spec, 0.0, False, {"error": err})
    if err == "unknown_scope":
        return _check_result(spec, 0.0, False, {"error": err})
    if err == "scope_missing_in_after":
        return _check_result(spec, 0.0, True, {"error": err})

    image_hash = spec.get("image_hash")
    matches = image_nodes_in_scope(after, scope_ids, image_hash)
    ok = len(matches) > 0
    return _check_result(
        spec,
        1.0 if ok else 0.0,
        True,
        {
            "scope": spec.get("scope", "node_id"),
            "image_hash": image_hash,
            "matched_node_ids": [n["id"] for n in matches if n.get("id")],
        },
    )


def _run_property_on_node(spec: dict[str, Any], after: Envelope) -> SubCheckResult:
    node_id = spec["node_id"]
    node = find_node(after, node_id)
    if not node:
        return _check_result(spec, 0.0, True, {"error": "node_missing"})

    actual = get_node_property(node, spec["property"])
    expected = spec.get("equals")
    ok = actual == expected or str(actual) == str(expected)
    return _check_result(
        spec,
        1.0 if ok else 0.0,
        True,
        {"property": spec["property"], "expected": expected, "actual": actual},
    )


def run_spec_check(
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    catalog: DesignCatalog,
) -> SubCheckResult:
    check_type = spec["type"]
    if check_type == "must_contain_text":
        return _run_must_contain_text(spec, graph, after)
    if check_type == "must_contain_image":
        return _run_must_contain_image(spec, graph, after)
    if check_type == "min_added_under":
        return _run_min_added_under(spec, graph, after)
    if check_type == "min_modified_under":
        return _run_min_modified_under(spec, graph, after)
    if check_type == "component_instances_under":
        return _run_component_instances_under(spec, after, catalog)
    if check_type == "metadata_only_under":
        return _run_metadata_only_under(spec, graph, after)
    if check_type == "property_on_node":
        return _run_property_on_node(spec, after)
    return _check_result(spec, 0.0, False, {"error": "unknown_type"})


def run_all_checks(
    checks: list[dict[str, Any]] | None,
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    catalog: DesignCatalog,
) -> list[SubCheckResult]:
    if not checks:
        return []
    return [run_spec_check(c, before, after, graph, catalog) for c in checks]
