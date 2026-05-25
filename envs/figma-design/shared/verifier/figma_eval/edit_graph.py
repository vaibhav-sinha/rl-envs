from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

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


_STYLE_LIST_KEYS = (
    ("paintStyles", "paint"),
    ("textStyles", "text"),
    ("effectStyles", "effect"),
    ("gridStyles", "grid"),
)


def _index_by_id(items: list[TreeNode] | None) -> dict[str, TreeNode]:
    out: dict[str, TreeNode] = {}
    for item in items or []:
        item_id = item.get("id")
        if item_id:
            out[str(item_id)] = item
    return out


def _variable_name_lookup(envelope: Envelope) -> dict[str, str]:
    names: dict[str, str] = {}
    for col in envelope.get("variableCollections") or []:
        for var in col.get("variables") or []:
            vid = var.get("id")
            if vid:
                names[str(vid)] = str(var.get("name") or vid)
    return names


def _summarize_paints(paints: list[dict[str, Any]] | None, var_names: dict[str, str]) -> str:
    parts: list[str] = []
    for paint in paints or []:
        ptype = paint.get("type")
        if ptype == "VARIABLE_COLOR":
            vid = str(paint.get("variableId") or "?")
            parts.append(f"VAR({var_names.get(vid, vid)})")
        elif ptype == "SOLID":
            parts.append("SOLID")
        elif ptype == "IMAGE":
            parts.append("IMAGE")
        elif ptype:
            parts.append(str(ptype))
    return ",".join(parts) if parts else "none"


def _summarize_style(
    style: TreeNode, *, kind: str, var_names: dict[str, str]
) -> str:
    name = style.get("name") or "?"
    style_id = style.get("id") or "?"
    if kind == "paint":
        return (
            f'{style_id} "{name}" paints={_summarize_paints(style.get("paints"), var_names)}'
        )
    if kind == "text":
        fills = _summarize_paints(style.get("fills"), var_names)
        font_size = style.get("fontSize")
        size_part = f" size={font_size}" if font_size is not None else ""
        return f'{style_id} "{name}"{size_part} fills={fills}'
    if kind == "effect":
        count = len(style.get("effects") or [])
        return f'{style_id} "{name}" effects={count}'
    if kind == "grid":
        count = len(style.get("layoutGrids") or [])
        return f'{style_id} "{name}" grids={count}'
    return f'{style_id} "{name}"'


def _diff_properties_generic(before: TreeNode, after: TreeNode) -> list[str]:
    keys = set(before.keys()) | set(after.keys())
    changed: list[str] = []
    for key in keys:
        if key == "id":
            continue
        if json.dumps(before.get(key), sort_keys=True) != json.dumps(after.get(key), sort_keys=True):
            changed.append(key)
    return changed


def _diff_style_lists(
    *,
    key: str,
    kind: str,
    before: Envelope,
    after: Envelope,
    var_names: dict[str, str],
    max_items: int,
) -> list[str]:
    before_by_id = _index_by_id(before.get(key))
    after_by_id = _index_by_id(after.get(key))
    before_ids = set(before_by_id)
    after_ids = set(after_by_id)
    added_ids = sorted(after_ids - before_ids)
    deleted_ids = sorted(before_ids - after_ids)
    modified_ids = sorted(
        nid
        for nid in before_ids & after_ids
        if json.dumps(before_by_id[nid], sort_keys=True)
        != json.dumps(after_by_id[nid], sort_keys=True)
    )

    if not added_ids and not deleted_ids and not modified_ids:
        return []

    lines = [f"{key}:"]
    if added_ids:
        lines.append(f"  added ({len(added_ids)}):")
        for style_id in added_ids[:max_items]:
            lines.append(
                f"  - {_summarize_style(after_by_id[style_id], kind=kind, var_names=var_names)}"
            )
        if len(added_ids) > max_items:
            lines.append(f"  ... ({len(added_ids) - max_items} more added truncated)")
    if deleted_ids:
        lines.append(f"  removed ({len(deleted_ids)}):")
        for style_id in deleted_ids[:max_items]:
            lines.append(
                f"  - {_summarize_style(before_by_id[style_id], kind=kind, var_names=var_names)}"
            )
        if len(deleted_ids) > max_items:
            lines.append(f"  ... ({len(deleted_ids) - max_items} more removed truncated)")
    if modified_ids:
        lines.append(f"  modified ({len(modified_ids)}):")
        for style_id in modified_ids[:max_items]:
            props = _diff_properties_generic(before_by_id[style_id], after_by_id[style_id])
            lines.append(
                f"  - {style_id} props={props}"
                if props
                else f"  - {style_id}"
            )
        if len(modified_ids) > max_items:
            lines.append(f"  ... ({len(modified_ids) - max_items} more modified truncated)")
    return lines


def _collect_variables(envelope: Envelope) -> dict[str, tuple[str, TreeNode]]:
    """Map variable id -> (collection name, variable dict)."""
    out: dict[str, tuple[str, TreeNode]] = {}
    for col in envelope.get("variableCollections") or []:
        col_name = str(col.get("name") or col.get("id") or "?")
        for var in col.get("variables") or []:
            vid = var.get("id")
            if vid:
                out[str(vid)] = (col_name, var)
    return out


def _summarize_variable(var: TreeNode, *, collection: str) -> str:
    vid = var.get("id") or "?"
    name = var.get("name") or "?"
    resolved = var.get("resolvedType") or "?"
    value_hint = ""
    values_by_mode = var.get("valuesByMode") or {}
    if values_by_mode:
        first = next(iter(values_by_mode.values()), None)
        if isinstance(first, dict) and first.get("type") == "FLOAT":
            raw_value = first.get("value")
            if isinstance(raw_value, (int, float)):
                value_hint = f"={raw_value}"
    return f'{vid} "{name}" {resolved}{value_hint} (collection: {collection})'


def _diff_variable_collections(
    before: Envelope,
    after: Envelope,
    *,
    max_items: int,
) -> list[str]:
    before_cols = _index_by_id(before.get("variableCollections"))
    after_cols = _index_by_id(after.get("variableCollections"))
    before_col_ids = set(before_cols)
    after_col_ids = set(after_cols)
    col_added = sorted(after_col_ids - before_col_ids)
    col_removed = sorted(before_col_ids - after_col_ids)
    col_modified = sorted(
        cid
        for cid in before_col_ids & after_col_ids
        if json.dumps(before_cols[cid], sort_keys=True)
        != json.dumps(after_cols[cid], sort_keys=True)
    )

    before_vars = _collect_variables(before)
    after_vars = _collect_variables(after)
    before_var_ids = set(before_vars)
    after_var_ids = set(after_vars)
    var_added = sorted(after_var_ids - before_var_ids)
    var_removed = sorted(before_var_ids - after_var_ids)
    var_modified = sorted(
        vid
        for vid in before_var_ids & after_var_ids
        if json.dumps(before_vars[vid][1], sort_keys=True)
        != json.dumps(after_vars[vid][1], sort_keys=True)
    )

    if not (col_added or col_removed or col_modified or var_added or var_removed or var_modified):
        return []

    lines = ["variableCollections:"]
    if col_added:
        lines.append(f"  collections added ({len(col_added)}):")
        for cid in col_added[:max_items]:
            col = after_cols[cid]
            lines.append(f'  - {cid} "{col.get("name") or "?"}"')
    if col_removed:
        lines.append(f"  collections removed ({len(col_removed)}):")
        for cid in col_removed[:max_items]:
            col = before_cols[cid]
            lines.append(f'  - {cid} "{col.get("name") or "?"}"')
    if col_modified:
        lines.append(f"  collections modified ({len(col_modified)}):")
        for cid in col_modified[:max_items]:
            props = _diff_properties_generic(before_cols[cid], after_cols[cid])
            lines.append(f"  - {cid} props={props}" if props else f"  - {cid}")
    if var_added:
        lines.append(f"  variables added ({len(var_added)}):")
        for vid in var_added[:max_items]:
            collection, var = after_vars[vid]
            lines.append(f"  - {_summarize_variable(var, collection=collection)}")
        if len(var_added) > max_items:
            lines.append(f"  ... ({len(var_added) - max_items} more variables added truncated)")
    if var_removed:
        lines.append(f"  variables removed ({len(var_removed)}):")
        for vid in var_removed[:max_items]:
            collection, var = before_vars[vid]
            lines.append(f"  - {_summarize_variable(var, collection=collection)}")
    if var_modified:
        lines.append(f"  variables modified ({len(var_modified)}):")
        for vid in var_modified[:max_items]:
            props = _diff_properties_generic(before_vars[vid][1], after_vars[vid][1])
            lines.append(f"  - {vid} props={props}" if props else f"  - {vid}")
    return lines


def format_resource_diff_summary(
    before: Envelope,
    after: Envelope,
    *,
    max_items: int = 50,
) -> str:
    var_names = _variable_name_lookup(after) | _variable_name_lookup(before)
    sections: list[str] = []
    for key, kind in _STYLE_LIST_KEYS:
        section = _diff_style_lists(
            key=key,
            kind=kind,
            before=before,
            after=after,
            var_names=var_names,
            max_items=max_items,
        )
        if section:
            sections.extend(section)
            sections.append("")

    var_section = _diff_variable_collections(before, after, max_items=max_items)
    if var_section:
        sections.extend(var_section)

    if not sections:
        return "resources: no style or variable changes"
    return "\n".join(sections).rstrip()


def format_diff_summary(
    graph: EditGraph,
    *,
    before: Envelope | None = None,
    after: Envelope | None = None,
    max_changes: int = 200,
    max_resource_items: int = 50,
) -> str:
    lines = [
        f"equal: {graph.equal}",
        f"added: {sorted(graph.added_ids)}",
        f"deleted: {sorted(graph.deleted_ids)}",
        f"modified: {sorted(graph.modified_ids)}",
        "changes:",
    ]
    for change in graph.changes[:max_changes]:
        props = change.changed_properties or []
        prop_suffix = f" props={props}" if props else ""
        lines.append(f"- {change.operation} {change.node_id}{prop_suffix}")
    if len(graph.changes) > max_changes:
        lines.append(f"... ({len(graph.changes) - max_changes} more changes truncated)")

    if before is not None and after is not None:
        lines.extend(
            [
                "",
                "## Resources (styles & variables)",
                format_resource_diff_summary(
                    before, after, max_items=max_resource_items
                ),
            ]
        )
    return "\n".join(lines)


def changed_node_ids(graph: EditGraph) -> set[str]:
    return set(graph.added_ids) | set(graph.deleted_ids) | set(graph.modified_ids)


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
