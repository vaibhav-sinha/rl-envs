"""Normalize hybrid/legacy component envelopes for stable verifier diffs."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from .types import Envelope, TreeNode

COMPONENT_MASTERS_PAGE_NAME = "__Component Masters"
GRAPH_NATIVE_COMPONENT_TYPES = frozenset({"COMPONENT", "COMPONENT_SET", "INSTANCE"})


def _walk_scene(nodes: list[TreeNode], visit) -> None:
    for node in nodes:
        visit(node)
        if node.get("type") in (
            "FRAME",
            "TRANSFORM_GROUP",
            "GROUP",
            "SECTION",
            "BOOLEAN_OPERATION",
        ):
            children = node.get("children") or []
            _walk_scene(children, visit)


def _document_has_graph_components(document: dict[str, Any]) -> bool:
    found = False
    for page in document.get("children") or []:
        def visit(n: TreeNode) -> None:
            nonlocal found
            if n.get("type") in GRAPH_NATIVE_COMPONENT_TYPES:
                found = True

        _walk_scene(page.get("children") or [], visit)
        if found:
            return True
    return False


def _node_exists_in_document(document: dict[str, Any], node_id: str) -> bool:
    for page in document.get("children") or []:
        if page.get("id") == node_id:
            return True
        found = False

        def visit(n: TreeNode) -> None:
            nonlocal found
            if n.get("id") == node_id:
                found = True

        _walk_scene(page.get("children") or [], visit)
        if found:
            return True
    return False


def _bump_next_internal_id(env: Envelope) -> None:
    max_id = 0
    for page in env.get("document", {}).get("children") or []:
        pid = page.get("id", "")
        if isinstance(pid, str) and pid.startswith("I"):
            try:
                max_id = max(max_id, int(pid[1:]))
            except ValueError:
                pass

        stack = list(page.get("children") or [])
        while stack:
            n = stack.pop()
            nid = n.get("id", "")
            if isinstance(nid, str) and nid.startswith("I"):
                try:
                    max_id = max(max_id, int(nid[1:]))
                except ValueError:
                    pass
            if n.get("type") in (
                "FRAME",
                "TRANSFORM_GROUP",
                "GROUP",
                "SECTION",
                "BOOLEAN_OPERATION",
            ):
                stack.extend(n.get("children") or [])

    next_id = env.get("nextInternalId", 0)
    if max_id + 1 > next_id:
        env["nextInternalId"] = max_id + 1


def _ensure_masters_page(env: Envelope) -> dict[str, Any]:
    document = env["document"]
    for page in document.get("children") or []:
        if page.get("name") == COMPONENT_MASTERS_PAGE_NAME:
            return page

    next_id = int(env.get("nextInternalId", 0))
    page = {
        "id": f"I{next_id}",
        "type": "PAGE",
        "name": COMPONENT_MASTERS_PAGE_NAME,
        "x": 0,
        "y": 0,
        "width": 1,
        "height": 1,
        "children": [],
    }
    env["nextInternalId"] = next_id + 1
    document.setdefault("children", []).append(page)
    return page


def _convert_component_instances(nodes: list[Any]) -> None:
    for i, node in enumerate(nodes):
        if isinstance(node, dict) and node.get("type") == "COMPONENT_INSTANCE":
            nodes[i] = {**node, "type": "INSTANCE"}
        if isinstance(node, dict) and isinstance(node.get("children"), list):
            _convert_component_instances(node["children"])


def normalize_component_envelope(env: Envelope) -> Envelope:
    """Mirror HFC load-time normalization so before/after diffs stay comparable."""
    if not env.get("components"):
        return env

    out = deepcopy(env)
    components = out.pop("components")
    document = out["document"]
    has_graph = _document_has_graph_components(document)
    masters_page = _ensure_masters_page(out)

    for comp in components:
        root = comp.get("root")
        if not isinstance(root, dict):
            continue
        root_id = root.get("id")
        if isinstance(root_id, str) and not _node_exists_in_document(document, root_id):
            masters_page.setdefault("children", []).append(root)

        comp_id = comp.get("id")
        if (
            not has_graph
            and isinstance(comp_id, str)
            and not _node_exists_in_document(document, comp_id)
        ):
            masters_page.setdefault("children", []).append(
                {
                    "id": comp_id,
                    "type": "COMPONENT",
                    "name": comp.get("name", "Component"),
                    "x": 0,
                    "y": 0,
                    "width": root.get("width", 100),
                    "height": root.get("height", 100),
                    "rootFrameId": root_id,
                }
            )

    for page in document.get("children") or []:
        _convert_component_instances(page.get("children") or [])

    _bump_next_internal_id(out)
    return out
