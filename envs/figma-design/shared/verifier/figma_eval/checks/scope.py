from __future__ import annotations

from typing import Any

from ..edit_graph import EditGraph
from ..tree import descendant_ids_deep, find_node, node_exists
from ..types import Envelope, TreeNode

FRAME_SCOPE_TYPES = frozenset({"FRAME", "SECTION"})


def added_frame_ids(graph: EditGraph, envelope: Envelope) -> list[str]:
    frame_ids: list[str] = []
    for nid in graph.added_ids:
        node = find_node(envelope, nid)
        if node and node.get("type") in FRAME_SCOPE_TYPES:
            frame_ids.append(nid)
    return frame_ids


def resolve_check_scope(
    spec: dict[str, Any],
    graph: EditGraph,
    envelope: Envelope,
) -> tuple[set[str], str | None]:
    scope = spec.get("scope", "node_id")
    if scope == "node_id":
        node_id = spec.get("node_id")
        if not node_id:
            return set(), "missing_node_id"
        if not node_exists(envelope, node_id):
            return set(), "scope_missing_in_after"
        return descendant_ids_deep(envelope, node_id), None
    if scope == "new_frames":
        frame_ids = added_frame_ids(graph, envelope)
        if not frame_ids:
            return set(), None
        ids: set[str] = set()
        for fid in frame_ids:
            ids |= descendant_ids_deep(envelope, fid)
        return ids, None
    return set(), "unknown_scope"


def _nodes_in_scope(envelope: Envelope, scope_ids: set[str]) -> list[TreeNode]:
    if not scope_ids:
        return []
    nodes: list[TreeNode] = []
    for node_id in scope_ids:
        node = find_node(envelope, node_id)
        if node is not None:
            nodes.append(node)
    return nodes


def text_nodes_containing(
    envelope: Envelope,
    scope_ids: set[str],
    substring: str,
    *,
    case_sensitive: bool = False,
) -> list[TreeNode]:
    if not scope_ids or not substring:
        return []
    needle = substring if case_sensitive else substring.casefold()
    matches: list[TreeNode] = []
    for node in _nodes_in_scope(envelope, scope_ids):
        if node.get("type") != "TEXT":
            continue
        chars = node.get("characters")
        if not isinstance(chars, str):
            continue
        haystack = chars if case_sensitive else chars.casefold()
        if needle in haystack:
            matches.append(node)
    return matches


def _image_hashes_on_node(node: TreeNode) -> list[str]:
    hashes: list[str] = []
    for key in ("fills", "backgrounds", "strokes"):
        for paint in node.get(key) or []:
            if paint.get("type") != "IMAGE":
                continue
            image_hash = paint.get("imageHash")
            if isinstance(image_hash, str) and image_hash:
                hashes.append(image_hash)
    return hashes


def image_nodes_in_scope(
    envelope: Envelope,
    scope_ids: set[str],
    image_hash: str | None = None,
) -> list[TreeNode]:
    if not scope_ids:
        return []
    matches: list[TreeNode] = []
    for node in _nodes_in_scope(envelope, scope_ids):
        hashes = _image_hashes_on_node(node)
        if not hashes:
            continue
        if image_hash is None:
            matches.append(node)
        elif image_hash in hashes:
            matches.append(node)
    return matches
