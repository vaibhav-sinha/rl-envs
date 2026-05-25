from __future__ import annotations

from typing import TYPE_CHECKING, Any, Iterator

from .types import EditGraph, Envelope, TreeNode

_INDEX_BY_ENVELOPE_ID: dict[int, dict[str, str]] = {}

if TYPE_CHECKING:
    from .edit_graph import EditGraph

CONTAINER_TYPES = frozenset(
    {"PAGE", "FRAME", "TRANSFORM_GROUP", "GROUP", "SECTION", "BOOLEAN_OPERATION"}
)

ENCLOSING_FRAME_TYPES = frozenset({"FRAME", "SECTION", "GROUP", "TRANSFORM_GROUP"})

COMPONENT_NODE_TYPES = frozenset({"COMPONENT", "COMPONENT_SET"})


def is_component_node(node: TreeNode) -> bool:
    return node.get("type") in COMPONENT_NODE_TYPES


def collect_component_ids(envelope: Envelope) -> set[str]:
    return {
        nid
        for node in find_all_nodes(envelope)
        if (nid := node.get("id")) and is_component_node(node)
    }


def _children(node: TreeNode) -> list[TreeNode]:
    if node.get("type") in ("DOCUMENT", "PAGE"):
        return node.get("children") or []
    if node.get("type") in CONTAINER_TYPES:
        return node.get("children") or []
    return []


def clear_node_ref_index_cache() -> None:
    """Clear cached Figma/HFC id maps (for tests)."""
    _INDEX_BY_ENVELOPE_ID.clear()


def _register_node_ref(index: dict[str, str], node: TreeNode) -> None:
    nid = node.get("id")
    if not isinstance(nid, str) or not nid:
        return
    index[nid] = nid
    sfid = node.get("sourceFigmaId")
    if not isinstance(sfid, str) or not sfid:
        return
    if is_component_node(node):
        index[sfid] = nid
    elif sfid not in index:
        index[sfid] = nid


def _build_node_ref_index(envelope: Envelope) -> dict[str, str]:
    index: dict[str, str] = {}

    def walk(node: TreeNode) -> None:
        _register_node_ref(index, node)
        for ch in _children(node):
            walk(ch)

    doc = envelope.get("document")
    if doc:
        walk(doc)
    return index


def get_node_ref_index(envelope: Envelope) -> dict[str, str]:
    key = id(envelope)
    cached = _INDEX_BY_ENVELOPE_ID.get(key)
    if cached is not None:
        return cached
    built = _build_node_ref_index(envelope)
    _INDEX_BY_ENVELOPE_ID[key] = built
    return built


def resolve_config_node_id(envelope: Envelope, ref_id: str) -> str | None:
    """Resolve an eval-spec node ref (Figma ``sourceFigmaId`` or HFC ``id``) to HFC id."""
    if not ref_id:
        return None
    hfc_id = get_node_ref_index(envelope).get(ref_id)
    if not hfc_id:
        return None
    if _find_node_by_hfc_id(envelope, hfc_id) is not None:
        return hfc_id
    return None


def resolve_config_node_ids(envelope: Envelope, ref_ids: list[str]) -> list[str]:
    resolved: list[str] = []
    for ref_id in ref_ids:
        hfc_id = resolve_config_node_id(envelope, ref_id)
        if hfc_id:
            resolved.append(hfc_id)
    return resolved


def _find_node_by_hfc_id(envelope: Envelope, node_id: str) -> TreeNode | None:
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


def find_node(envelope: Envelope, node_ref: str) -> TreeNode | None:
    """Find a node by HFC id or Figma ``sourceFigmaId`` (eval-spec SME ids)."""
    hfc_id = resolve_config_node_id(envelope, node_ref)
    if not hfc_id:
        return None
    return _find_node_by_hfc_id(envelope, hfc_id)


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


def descendant_ids(envelope: Envelope, root_ref: str) -> set[str]:
    root = find_node(envelope, root_ref)
    if not root:
        return set()
    return {n["id"] for n in iter_nodes(root) if n.get("id")}


def is_node_under_roots(envelope: Envelope, node_id: str, root_ids: list[str]) -> bool:
    for root_id in root_ids:
        if node_id in descendant_ids(envelope, root_id):
            return True
    return False


def _allowed_before_scope(before: Envelope, root_ids: list[str]) -> set[str]:
    allowed: set[str] = set()
    for root_id in root_ids:
        allowed |= descendant_ids(before, root_id)
    return allowed


def changes_inside_allowed_region(
    graph: EditGraph,
    before: Envelope,
    after: Envelope,
    root_ids: list[str],
) -> set[str]:
    """Node ids changed within *root_ids* (same rules as gates.allowed_change_inside)."""
    allowed_before = _allowed_before_scope(before, root_ids)
    inside: set[str] = set()

    for nid in graph.added_ids:
        if is_node_under_roots(after, nid, root_ids):
            inside.add(nid)

    for nid in graph.modified_ids:
        if nid in allowed_before and is_node_under_roots(after, nid, root_ids):
            inside.add(nid)

    for nid in graph.deleted_ids:
        if nid in allowed_before:
            inside.add(nid)

    return inside


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


def resolve_largest_change_region_node(
    envelope: Envelope,
    graph: EditGraph,
) -> str | None:
    """Pick the screenshot target for the largest design change region."""
    changed_ids = graph.added_ids | graph.deleted_ids | graph.modified_ids
    return resolve_compare_with_reference_screenshot_node(
        envelope,
        changed_ids,
        added_ids=graph.added_ids,
        modified_ids=graph.modified_ids,
    )


def resolve_compare_with_reference_screenshot_node(
    envelope: Envelope, changed_ids: set[str], *, added_ids: set[str], modified_ids: set[str]
) -> str | None:
    """Pick screenshot target for agent result vs reference visual checks."""
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


def _node_frame_area(envelope: Envelope, node_id: str) -> float:
    node = find_node(envelope, node_id)
    if not node:
        return 0.0
    w = node.get("width") or 0
    h = node.get("height") or 0
    return float(w) * float(h)


def _enclosing_frame_ids_for_node(
    envelope: Envelope,
    node_id: str,
    *,
    under_roots: list[str] | None = None,
) -> list[str]:
    parents = parent_id_map(envelope)
    frames: list[str] = []
    cur: str | None = node_id
    while cur:
        node = find_node(envelope, cur)
        if node and node.get("type") in ENCLOSING_FRAME_TYPES:
            if under_roots is None or is_node_under_roots(envelope, cur, under_roots):
                frames.append(cur)
        cur = parents.get(cur)
    return frames


def resolve_task_completeness_screenshot_node(
    envelope: Envelope,
    before: Envelope,
    graph: EditGraph,
    *,
    allowed_root_ids: list[str] | None,
) -> str | None:
    """Pick the largest enclosing frame for task_completeness screenshots.

    When *allowed_root_ids* is set and there are changes inside that region, use
    the largest frame among those inside changes. Otherwise use the largest frame
    among changes outside the allowed region (or among all changes when unset).
    """
    all_changes = graph.added_ids | graph.deleted_ids | graph.modified_ids
    if not all_changes:
        return None

    resolved_allowed_roots: list[str] | None = None
    if allowed_root_ids:
        resolved_allowed_roots = resolve_config_node_ids(envelope, allowed_root_ids)
        inside = changes_inside_allowed_region(graph, before, envelope, allowed_root_ids)
        if inside:
            target = inside
            under_roots = resolved_allowed_roots or None
        else:
            target = all_changes - inside
            under_roots = None
    else:
        target = all_changes
        under_roots = None

    candidates: set[str] = set()
    for nid in target:
        candidates.update(
            _enclosing_frame_ids_for_node(envelope, nid, under_roots=under_roots)
        )

    if not candidates:
        for nid in target:
            node = find_node(envelope, nid)
            if node and node.get("type") in ENCLOSING_FRAME_TYPES:
                candidates.add(nid)

    if resolved_allowed_roots:
        candidates -= set(resolved_allowed_roots)

    if not candidates:
        return next(iter(target))

    return max(candidates, key=lambda nid: _node_frame_area(envelope, nid))


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
        parents = parent_id_map(envelope)
        nearest_frames: list[tuple[str, int]] = []
        for nid in node_ids:
            cur: str | None = nid
            while cur:
                node = find_node(envelope, cur)
                if node and node.get("type") in ENCLOSING_FRAME_TYPES:
                    nearest_frames.append((cur, len(descendant_ids(envelope, cur))))
                    break
                cur = parents.get(cur)
        if nearest_frames:
            nearest_frames.sort(key=lambda item: item[1])
            return nearest_frames[0][0]
        return next(iter(node_ids))

    containing_frames.sort(key=lambda item: item[1])
    return containing_frames[0][0]


FRAME_SCOPE_TYPES = frozenset({"FRAME", "SECTION"})


def _is_added_frame(envelope: Envelope, node_id: str) -> bool:
    node = find_node(envelope, node_id)
    return node is not None and node.get("type") in FRAME_SCOPE_TYPES


def added_top_level_frame_ids(envelope: Envelope, graph: EditGraph) -> list[str]:
    return [nid for nid in graph.added_ids if is_top_level_frame(envelope, nid)]


def modified_top_level_frame_ids(envelope: Envelope, graph: EditGraph) -> list[str]:
    result: list[str] = []
    for nid in graph.modified_ids:
        node = find_node(envelope, nid)
        if not node or node.get("type") not in ENCLOSING_FRAME_TYPES:
            continue
        if is_top_level_frame(envelope, nid):
            result.append(nid)
    return result


def _filter_under_roots(
    envelope: Envelope,
    node_ids: list[str],
    under_roots: list[str] | None,
) -> list[str]:
    if not under_roots:
        return node_ids
    return [nid for nid in node_ids if is_node_under_roots(envelope, nid, under_roots)]


def largest_added_descendant_frame_id(
    envelope: Envelope,
    graph: EditGraph,
    root_id: str,
) -> str | None:
    """Largest added FRAME strictly inside ``root_id`` (excludes the root itself)."""
    candidates: list[str] = []
    for nid in graph.added_ids:
        if nid == root_id:
            continue
        node = find_node(envelope, nid)
        if not node or node.get("type") != "FRAME":
            continue
        if not is_node_under_roots(envelope, nid, [root_id]):
            continue
        candidates.append(nid)
    if not candidates:
        return None
    return max(candidates, key=lambda nid: _node_frame_area(envelope, nid))


def largest_added_frame_id(
    envelope: Envelope,
    graph: EditGraph,
    *,
    under_roots: list[str] | None = None,
    top_level_only: bool = False,
) -> str | None:
    candidates: list[str] = []
    for nid in graph.added_ids:
        if not _is_added_frame(envelope, nid):
            continue
        if top_level_only and not is_top_level_frame(envelope, nid):
            continue
        candidates.append(nid)
    candidates = _filter_under_roots(envelope, candidates, under_roots)
    if not candidates:
        return None
    return max(candidates, key=lambda nid: _node_frame_area(envelope, nid))


def largest_changed_frame_id(
    envelope: Envelope,
    graph: EditGraph,
    *,
    under_roots: list[str] | None = None,
) -> str | None:
    candidates: list[str] = []
    for nid in graph.modified_ids:
        node = find_node(envelope, nid)
        if not node or node.get("type") not in ENCLOSING_FRAME_TYPES:
            continue
        candidates.append(nid)
    candidates = _filter_under_roots(envelope, candidates, under_roots)
    if not candidates:
        return None
    return max(candidates, key=lambda nid: _node_frame_area(envelope, nid))


def largest_frame_among_changes(
    envelope: Envelope,
    before: Envelope,
    graph: EditGraph,
    *,
    allowed_root_ids: list[str] | None = None,
) -> str | None:
    return resolve_task_completeness_screenshot_node(
        envelope,
        before,
        graph,
        allowed_root_ids=allowed_root_ids,
    )


def _node_canvas_position(envelope: Envelope, node_id: str) -> tuple[float, float]:
    node = find_node(envelope, node_id)
    if not node:
        return (0.0, 0.0)
    x = node.get("x") or 0
    y = node.get("y") or 0
    return (float(y), float(x))


def sort_frames_by_canvas(envelope: Envelope, node_ids: list[str]) -> list[str]:
    return sorted(node_ids, key=lambda nid: _node_canvas_position(envelope, nid))


def topmost_added_frame_ids(
    envelope: Envelope,
    graph: EditGraph,
    *,
    under_roots: list[str] | None = None,
) -> list[str]:
    added_frames = [
        nid for nid in graph.added_ids if _is_added_frame(envelope, nid)
    ]
    added_frames = _filter_under_roots(envelope, added_frames, under_roots)
    added_set = set(added_frames)
    parents = parent_id_map(envelope)
    topmost: list[str] = []
    for nid in added_frames:
        cur: str | None = parents.get(nid)
        has_added_ancestor = False
        while cur:
            if cur in added_set:
                has_added_ancestor = True
                break
            cur = parents.get(cur)
        if not has_added_ancestor:
            topmost.append(nid)
    return sort_frames_by_canvas(envelope, topmost)


def added_frames_under_same_parent(
    envelope: Envelope,
    graph: EditGraph,
) -> tuple[str, list[str]] | None:
    """Return (parent_id, sibling_added_frames) when 2+ added frames share a parent."""
    parents = parent_id_map(envelope)
    by_parent: dict[str, list[str]] = {}
    for nid in graph.added_ids:
        if not _is_added_frame(envelope, nid):
            continue
        parent_id = parents.get(nid)
        if not parent_id:
            continue
        by_parent.setdefault(parent_id, []).append(nid)
    for parent_id, siblings in by_parent.items():
        if len(siblings) >= 2:
            return parent_id, sort_frames_by_canvas(envelope, siblings)
    return None


def minimal_enclosing_for_changes(
    envelope: Envelope,
    graph: EditGraph,
    *,
    under_roots: list[str] | None = None,
) -> str | None:
    changed = graph.added_ids | graph.deleted_ids | graph.modified_ids
    if under_roots:
        changed = {nid for nid in changed if is_node_under_roots(envelope, nid, under_roots)}
    if not changed:
        return None
    return resolve_minimal_enclosing_frame(envelope, changed)


def get_node_property(node: TreeNode, property_path: str) -> Any:
    parts = property_path.split(".")
    cur: Any = node
    for part in parts:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur
