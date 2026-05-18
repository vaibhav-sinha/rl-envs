from __future__ import annotations

import json
from copy import deepcopy

from .tree import descendant_ids
from .types import METADATA_PROPERTY_KEYS, EditGraph, Envelope, NodeChange, TreeNode


def _collect_nodes(envelope: Envelope) -> dict[str, TreeNode]:
    nodes: dict[str, TreeNode] = {}

    def walk(node: TreeNode) -> None:
        if node.get("type") != "DOCUMENT" and node.get("id"):
            nodes[node["id"]] = node
        for ch in _walk_children(node):
            walk(ch)

    doc = envelope.get("document")
    if doc:
        walk(doc)
    return nodes


def _walk_children(node: TreeNode) -> list[TreeNode]:
    if node.get("type") == "DOCUMENT":
        return node.get("children") or []
    if node.get("type") == "PAGE":
        return node.get("children") or []
    if node.get("type") in (
        "FRAME",
        "TRANSFORM_GROUP",
        "GROUP",
        "SECTION",
        "BOOLEAN_OPERATION",
    ):
        return node.get("children") or []
    return []


def _stable_node_json(node: TreeNode) -> str:
    clone = deepcopy(node)
    clone.pop("children", None)
    return json.dumps(clone, sort_keys=True)


def _diff_properties(before: TreeNode, after: TreeNode) -> list[str]:
    keys = set(before.keys()) | set(after.keys())
    changed: list[str] = []
    for k in keys:
        if k in ("children", "id", "type"):
            continue
        if json.dumps(before.get(k), sort_keys=True) != json.dumps(after.get(k), sort_keys=True):
            changed.append(k)
    return changed


def build_edit_graph(before: Envelope, after: Envelope) -> EditGraph:
    before_nodes = _collect_nodes(before)
    after_nodes = _collect_nodes(after)
    before_ids = set(before_nodes.keys())
    after_ids = set(after_nodes.keys())

    added_ids = {i for i in after_ids if i not in before_ids}
    deleted_ids = {i for i in before_ids if i not in after_ids}
    modified_ids: set[str] = set()

    for nid in before_ids & after_ids:
        if _stable_node_json(before_nodes[nid]) != _stable_node_json(after_nodes[nid]):
            modified_ids.add(nid)

    changes: list[NodeChange] = []
    for nid in added_ids:
        changes.append(NodeChange(node_id=nid, operation="add"))
    for nid in deleted_ids:
        changes.append(NodeChange(node_id=nid, operation="delete"))
    for nid in modified_ids:
        changes.append(
            NodeChange(
                node_id=nid,
                operation="modify",
                changed_properties=_diff_properties(before_nodes[nid], after_nodes[nid]),
            )
        )

    return EditGraph(
        equal=len(changes) == 0,
        changes=changes,
        added_ids=added_ids,
        deleted_ids=deleted_ids,
        modified_ids=modified_ids,
    )


def added_ids_under(graph: EditGraph, parent_id: str, envelope: Envelope) -> list[str]:
    scope = descendant_ids(envelope, parent_id)
    return [i for i in graph.added_ids if i in scope]


def modified_ids_under(graph: EditGraph, parent_id: str, envelope: Envelope) -> list[str]:
    scope = descendant_ids(envelope, parent_id)
    return [i for i in graph.modified_ids if i in scope]


def is_metadata_only_change(changed_properties: list[str] | None) -> bool:
    if not changed_properties:
        return True
    return all(p in METADATA_PROPERTY_KEYS for p in changed_properties)


def resolve_focus_node_id(
    before: Envelope,
    after: Envelope,
    region_id: str,
    focus: str,
) -> str:
    from .tree import find_node

    if focus == "all":
        return region_id

    graph = build_edit_graph(before, after)
    added = added_ids_under(graph, region_id, after)
    if not added:
        return region_id
    if focus == "added":
        return added[0]

    best = added[0]
    best_area = 0.0
    for nid in added:
        node = find_node(after, nid)
        if not node or node.get("type") in ("DOCUMENT", "PAGE"):
            continue
        w = node.get("width") or 0
        h = node.get("height") or 0
        area = float(w) * float(h)
        if area > best_area:
            best_area = area
            best = nid
    return best
