from __future__ import annotations

from typing import Any, Iterator

from .types import Envelope, TreeNode

CONTAINER_TYPES = frozenset(
    {"PAGE", "FRAME", "TRANSFORM_GROUP", "GROUP", "SECTION", "BOOLEAN_OPERATION"}
)


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


def node_exists(envelope: Envelope, node_id: str) -> bool:
    return find_node(envelope, node_id) is not None


def is_instance_node(node: TreeNode) -> bool:
    return node.get("type") in ("INSTANCE", "COMPONENT_INSTANCE")


def get_main_component_id(node: TreeNode) -> str | None:
    if not is_instance_node(node):
        return None
    return node.get("mainComponentId")


def get_node_property(node: TreeNode, property_path: str) -> Any:
    parts = property_path.split(".")
    cur: Any = node
    for part in parts:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur
