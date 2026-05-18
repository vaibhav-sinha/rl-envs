from __future__ import annotations

from typing import Any, Iterator

from .types import Envelope, TreeNode

CONTAINER_TYPES = frozenset(
    {"PAGE", "FRAME", "TRANSFORM_GROUP", "GROUP", "SECTION", "BOOLEAN_OPERATION"}
)

ENCLOSING_FRAME_TYPES = frozenset({"FRAME", "SECTION", "GROUP", "TRANSFORM_GROUP"})


def _children(node: TreeNode) -> list[TreeNode]:
    if node.get("type") in ("DOCUMENT", "PAGE"):
        return node.get("children") or []
    if node.get("type") in CONTAINER_TYPES:
        return node.get("children") or []
    return []


def find_node(envelope: Envelope, node_id: str) -> TreeNode | None:
    doc = envelope.get("document")
    if not doc:
        return None

    def walk(node: TreeNode) -> TreeNode | None:
        if node.get("id") == node_id:
            return node
        for ch in _children(node):
            found = walk(ch)
            if found is not None:
                return found
        return None

    if doc.get("id") == node_id:
        return doc
    for page in doc.get("children") or []:
        found = walk(page)
        if found is not None:
            return found
    return None


def iter_nodes(root: TreeNode) -> Iterator[TreeNode]:
    if root.get("type") != "DOCUMENT":
        yield root
    for ch in _children(root):
        yield from iter_nodes(ch)


def find_all_nodes(envelope: Envelope) -> list[TreeNode]:
    doc = envelope.get("document")
    if not doc:
        return []
    nodes: list[TreeNode] = []
    for page in doc.get("children") or []:
        nodes.extend(iter_nodes(page))
    return nodes


def descendant_ids(envelope: Envelope, root_id: str) -> set[str]:
    root = find_node(envelope, root_id)
    if not root:
        return set()
    return {n["id"] for n in iter_nodes(root) if n.get("id")}


def is_node_under_roots(envelope: Envelope, node_id: str, root_ids: list[str]) -> bool:
    for root_id in root_ids:
        if node_id in descendant_ids(envelope, root_id):
            return True
    return False


def node_exists(envelope: Envelope, node_id: str) -> bool:
    return find_node(envelope, node_id) is not None


def is_instance_node(node: TreeNode) -> bool:
    return node.get("type") in ("INSTANCE", "COMPONENT_INSTANCE")


def get_main_component_id(node: TreeNode) -> str | None:
    if not is_instance_node(node):
        return None
    return node.get("mainComponentId")


def parent_id_map(envelope: Envelope) -> dict[str, str]:
    parents: dict[str, str] = {}

    def walk(node: TreeNode, parent_id: str | None) -> None:
        nid = node.get("id")
        if nid and parent_id is not None:
            parents[nid] = parent_id
        for ch in _children(node):
            walk(ch, nid if nid else parent_id)

    doc = envelope.get("document")
    if not doc:
        return parents
    for page in doc.get("children") or []:
        walk(page, None)
    return parents


def is_top_level_frame(envelope: Envelope, node_id: str) -> bool:
    node = find_node(envelope, node_id)
    if not node or node.get("type") not in ENCLOSING_FRAME_TYPES:
        return False
    parent_id = parent_id_map(envelope).get(node_id)
    if not parent_id:
        return False
    parent = find_node(envelope, parent_id)
    return parent is not None and parent.get("type") == "PAGE"


def resolve_compare_with_reference_screenshot_node(
    envelope: Envelope, changed_ids: set[str], *, added_ids: set[str], modified_ids: set[str]
) -> str | None:
    """Pick screenshot target for compare_with_reference visual check."""
    added_top_level = [nid for nid in added_ids if is_top_level_frame(envelope, nid)]

    modified_frames = {
        nid
        for nid in modified_ids
        if (node := find_node(envelope, nid)) and node.get("type") in ENCLOSING_FRAME_TYPES
    }

    if len(modified_frames) > 1:
        return resolve_minimal_enclosing_frame(envelope, modified_frames)

    if len(added_top_level) == 1:
        return added_top_level[0]

    if len(modified_frames) == 1:
        return next(iter(modified_frames))

    if len(added_top_level) > 1:
        return resolve_minimal_enclosing_frame(envelope, set(added_top_level))

    if changed_ids:
        return resolve_minimal_enclosing_frame(envelope, changed_ids)

    return None


def resolve_minimal_enclosing_frame(envelope: Envelope, node_ids: set[str]) -> str | None:
    """Smallest frame-like node that contains every node in *node_ids*."""
    if not node_ids:
        return None

    parents = parent_id_map(envelope)
    containing_frames: list[tuple[str, int]] = []

    for node in find_all_nodes(envelope):
        nid = node.get("id")
        if not nid or node.get("type") not in ENCLOSING_FRAME_TYPES:
            continue
        scope = descendant_ids(envelope, nid)
        if node_ids <= scope:
            containing_frames.append((nid, len(scope)))

    if not containing_frames:
        return next(iter(node_ids))

    containing_frames.sort(key=lambda item: item[1])
    return containing_frames[0][0]


def get_node_property(node: TreeNode, property_path: str) -> Any:
    parts = property_path.split(".")
    cur: Any = node
    for part in parts:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur
