from __future__ import annotations

from typing import Any

from .design_system import collect_content_node_ids
from .edit_graph import EditGraph
from .tree import find_node
from .types import Envelope, SubCheckResult, TreeNode

WCAG_AA_NORMAL = 4.5
MAX_DISTINCT_FONTS = 5
MIN_READABLE_FONT_SIZE = 10
DEFAULT_FG = {"r": 0.0, "g": 0.0, "b": 0.0}
DEFAULT_BG = {"r": 1.0, "g": 1.0, "b": 1.0}


def _heur_result(
    heur_id: str, score: float, applicable: bool, details: dict[str, Any] | None = None
) -> SubCheckResult:
    return SubCheckResult(
        id=heur_id,
        category="heuristics",
        score=score,
        applicable=applicable,
        weight=1.0,
        details=details,
    )


def _first_solid_color(paints: list[dict[str, Any]] | None) -> dict[str, float] | None:
    for paint in paints or []:
        if paint.get("type") == "SOLID":
            return paint["color"]
    return None


def _srgb_channel(c: float) -> float:
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def _relative_luminance(color: dict[str, float]) -> float:
    r = _srgb_channel(color["r"])
    g = _srgb_channel(color["g"])
    b = _srgb_channel(color["b"])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _contrast_ratio(fg: dict[str, float], bg: dict[str, float]) -> float:
    l1, l2 = _relative_luminance(fg), _relative_luminance(bg)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


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


def _resolve_background_color(envelope: Envelope, node_id: str) -> dict[str, float]:
    current = _parent_id_of(envelope, node_id)
    while current:
        node = find_node(envelope, current)
        if node:
            c = _first_solid_color(node.get("fills")) or _first_solid_color(node.get("backgrounds"))
            if c:
                return c
        current = _parent_id_of(envelope, current)
    return DEFAULT_BG


def _text_foreground_color(node: TreeNode) -> dict[str, float]:
    c = _first_solid_color(node.get("fills"))
    if c:
        return c
    for seg in node.get("styledSegments") or []:
        c = _first_solid_color((seg.get("style") or {}).get("fills"))
        if c:
            return c
    return DEFAULT_FG


def _effective_font_size(node: TreeNode, envelope: Envelope) -> float | None:
    fs = node.get("fontSize")
    if isinstance(fs, (int, float)):
        return float(fs)
    tsid = node.get("textStyleId")
    if tsid:
        for style in envelope.get("textStyles") or []:
            if style.get("id") == tsid and isinstance(style.get("fontSize"), (int, float)):
                return float(style["fontSize"])
    for seg in node.get("styledSegments") or []:
        sfs = (seg.get("style") or {}).get("fontSize")
        if isinstance(sfs, (int, float)):
            return float(sfs)
    return None


def _font_signature(node: TreeNode, envelope: Envelope) -> str:
    size = _effective_font_size(node, envelope)
    style_name = None
    tsid = node.get("textStyleId")
    if tsid:
        for style in envelope.get("textStyles") or []:
            if style.get("id") == tsid:
                style_name = style.get("name")
                break
    family = (node.get("fontName") or {}).get("family") or style_name or "default"
    return f"{family}:{size if size is not None else 'inherit'}"


def _text_nodes_in_content(after: Envelope, content_ids: set[str]) -> list[TreeNode]:
    nodes: list[TreeNode] = []
    for nid in content_ids:
        node = find_node(after, nid)
        if node and node.get("type") == "TEXT":
            nodes.append(node)
    return nodes


def run_heuristics(_before: Envelope, after: Envelope, graph: EditGraph) -> list[SubCheckResult]:
    content_ids = collect_content_node_ids(graph, after)
    if not content_ids:
        reason = {"reason": "no_content_changes"}
        return [
            _heur_result("heuristics.contrast", 1.0, False, reason),
            _heur_result("heuristics.font_count", 1.0, False, reason),
            _heur_result("heuristics.readable_font_size", 1.0, False, reason),
        ]

    texts = _text_nodes_in_content(after, content_ids)

    if not texts:
        contrast = _heur_result("heuristics.contrast", 1.0, False, {"reason": "no_text_in_content"})
        font_count = _heur_result("heuristics.font_count", 1.0, False, {"reason": "no_text_in_content"})
        readable = _heur_result("heuristics.readable_font_size", 1.0, False, {"reason": "no_text_in_content"})
    else:
        ratios = [
            _contrast_ratio(_text_foreground_color(t), _resolve_background_color(after, t["id"]))
            for t in texts
        ]
        mean_ratio = sum(ratios) / len(ratios)
        contrast = _heur_result(
            "heuristics.contrast",
            min(1.0, mean_ratio / WCAG_AA_NORMAL),
            True,
            {
                "texts_checked": len(texts),
                "mean_contrast_ratio": mean_ratio,
                "min_ratio": min(ratios),
            },
        )

        signatures = {_font_signature(t, after) for t in texts}
        count = len(signatures)
        fc_score = (
            1.0
            if count <= MAX_DISTINCT_FONTS
            else max(0.0, 1.0 - (count - MAX_DISTINCT_FONTS) / MAX_DISTINCT_FONTS)
        )
        font_count = _heur_result(
            "heuristics.font_count",
            fc_score,
            True,
            {"distinct_fonts": count, "max_recommended": MAX_DISTINCT_FONTS},
        )

        violations = 0
        sizes: list[float] = []
        for t in texts:
            size = _effective_font_size(t, after)
            if size is None:
                continue
            sizes.append(size)
            if size < MIN_READABLE_FONT_SIZE:
                violations += 1
        if not sizes:
            readable = _heur_result(
                "heuristics.readable_font_size", 1.0, False, {"reason": "no_resolved_font_sizes"}
            )
        else:
            readable = _heur_result(
                "heuristics.readable_font_size",
                1.0 - violations / len(sizes),
                True,
                {
                    "violations": violations,
                    "sizes_checked": len(sizes),
                    "min_size": min(sizes),
                },
            )

    return [contrast, font_count, readable]
