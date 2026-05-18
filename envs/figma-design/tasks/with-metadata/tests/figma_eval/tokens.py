from __future__ import annotations

from enum import Enum
from typing import Any

from .types import CanonicalValue, Envelope, TreeNode

AUTO_LAYOUT_MODES = frozenset({"HORIZONTAL", "VERTICAL"})

_COLOR_ROUND = 4
_FLOAT_ROUND = 2


class TokenRole(str, Enum):
    TEXT_COLOR = "text_color"
    TEXT_FONT_SIZE = "text_font_size"
    TEXT_FONT_FAMILY = "text_font_family"
    TEXT_FONT_WEIGHT = "text_font_weight"
    FILL_PAINT = "fill_paint"
    BACKGROUND_PAINT = "background_paint"
    STROKE_PAINT = "stroke_paint"
    STROKE_WEIGHT = "stroke_weight"
    CORNER_RADIUS = "corner_radius"
    EFFECT = "effect"
    LAYOUT_ITEM_SPACING = "layout_item_spacing"
    LAYOUT_COUNTER_AXIS_SPACING = "layout_counter_axis_spacing"
    LAYOUT_PADDING_LEFT = "layout_padding_left"
    LAYOUT_PADDING_RIGHT = "layout_padding_right"
    LAYOUT_PADDING_TOP = "layout_padding_top"
    LAYOUT_PADDING_BOTTOM = "layout_padding_bottom"
    LAYOUT_GRID = "layout_grid"


TokenOccurrence = tuple[TokenRole, CanonicalValue]

_LAYOUT_PROP_ROLES: dict[str, TokenRole] = {
    "itemSpacing": TokenRole.LAYOUT_ITEM_SPACING,
    "counterAxisSpacing": TokenRole.LAYOUT_COUNTER_AXIS_SPACING,
    "paddingLeft": TokenRole.LAYOUT_PADDING_LEFT,
    "paddingRight": TokenRole.LAYOUT_PADDING_RIGHT,
    "paddingTop": TokenRole.LAYOUT_PADDING_TOP,
    "paddingBottom": TokenRole.LAYOUT_PADDING_BOTTOM,
}

_CORNER_KEYS = (
    "cornerRadius",
    "topLeftRadius",
    "topRightRadius",
    "bottomLeftRadius",
    "bottomRightRadius",
)


class VariableResolver:
    def __init__(self, envelope: Envelope) -> None:
        self._values: dict[str, dict[str, Any]] = {}
        active = envelope.get("activeModeByCollectionId") or {}
        for col in envelope.get("variableCollections") or []:
            col_id = col.get("id")
            if not col_id:
                continue
            mode_id = active.get(col_id) or col.get("defaultModeId")
            for var in col.get("variables") or []:
                vid = var.get("id")
                if not vid or not mode_id:
                    continue
                raw = (var.get("valuesByMode") or {}).get(mode_id)
                if raw is not None:
                    self._values[vid] = raw

    def get(self, variable_id: str) -> dict[str, Any] | None:
        return self._values.get(variable_id)

    def resolve_numeric(self, node: TreeNode, prop: str) -> float | None:
        bv = node.get("boundVariables") or {}
        vid = bv.get(prop)
        if isinstance(vid, str):
            raw = self.get(vid)
            if raw and raw.get("type") == "FLOAT" and isinstance(raw.get("value"), (int, float)):
                return float(raw["value"])
        val = node.get(prop)
        if isinstance(val, (int, float)):
            return float(val)
        return None


def canonical_float(value: float) -> CanonicalValue:
    return ("float", round(value, _FLOAT_ROUND))


def canonical_color(color: dict[str, float]) -> CanonicalValue:
    parts: list[Any] = ["color"]
    for key in ("r", "g", "b", "a"):
        v = color.get(key)
        if isinstance(v, (int, float)):
            parts.append(round(float(v), _COLOR_ROUND))
        elif key != "a":
            parts.append(0.0)
    return tuple(parts)


def canonical_font_family(font_name: dict[str, Any] | None) -> CanonicalValue | None:
    if not font_name:
        return None
    family = font_name.get("family")
    style = font_name.get("style")
    if not family:
        return None
    return ("font", str(family), str(style) if style else "")


def canonical_font_weight(weight: Any) -> CanonicalValue | None:
    if isinstance(weight, (int, float)):
        return ("weight", int(weight) if float(weight).is_integer() else round(float(weight), 2))
    return None


def canonical_paint(paint: dict[str, Any], resolver: VariableResolver) -> CanonicalValue | None:
    ptype = paint.get("type")
    if ptype == "SOLID":
        color = paint.get("color")
        if isinstance(color, dict):
            return ("paint", "SOLID", canonical_color(color))
    if ptype == "VARIABLE_COLOR":
        vid = paint.get("variableId")
        if isinstance(vid, str):
            raw = resolver.get(vid)
            if raw and raw.get("type") == "COLOR" and isinstance(raw.get("color"), dict):
                return ("paint", "SOLID", canonical_color(raw["color"]))
        return ("paint", "VARIABLE_COLOR", vid)
    if ptype and str(ptype).startswith("GRADIENT"):
        stops: list[Any] = []
        for stop in paint.get("gradientStops") or []:
            pos = stop.get("position")
            color = stop.get("color")
            if isinstance(color, dict):
                stops.append(
                    (
                        round(float(pos), 4) if isinstance(pos, (int, float)) else 0,
                        canonical_color(color),
                    )
                )
        stops.sort(key=lambda s: s[0])
        return ("paint", str(ptype), tuple(stops))
    return None


def canonical_effect(effect: dict[str, Any]) -> CanonicalValue | None:
    etype = effect.get("type")
    if not etype:
        return None
    parts: list[Any] = ["effect", str(etype)]
    offset = effect.get("offset")
    if isinstance(offset, dict):
        parts.append(
            (
                round(float(offset.get("x", 0)), 2),
                round(float(offset.get("y", 0)), 2),
            )
        )
    radius = effect.get("radius")
    if isinstance(radius, (int, float)):
        parts.append(round(float(radius), 2))
    spread = effect.get("spread")
    if isinstance(spread, (int, float)):
        parts.append(round(float(spread), 2))
    color = effect.get("color")
    if isinstance(color, dict):
        parts.append(canonical_color(color))
    return tuple(parts)


def canonical_layout_grid(grid: dict[str, Any]) -> CanonicalValue | None:
    gtype = grid.get("type")
    if not gtype:
        return None
    parts: list[Any] = ["grid", str(gtype)]
    for key in ("count", "gutter", "offset", "sectionSize"):
        val = grid.get(key)
        if isinstance(val, (int, float)):
            parts.append((key, round(float(val), 2)))
    return tuple(parts)


def _add_paint_tokens(
    out: list[TokenOccurrence],
    paints: list[dict[str, Any]] | None,
    role: TokenRole,
    resolver: VariableResolver,
) -> None:
    for paint in paints or []:
        canon = canonical_paint(paint, resolver)
        if canon:
            out.append((role, canon))


def _extract_text_tokens(
    node: TreeNode,
    resolver: VariableResolver,
    envelope: Envelope,
) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []

    def add_text_style_fields(style: dict[str, Any]) -> None:
        for paint in style.get("fills") or []:
            canon = canonical_paint(paint, resolver)
            if canon:
                out.append((TokenRole.TEXT_COLOR, canon))
        fs = style.get("fontSize")
        if isinstance(fs, (int, float)):
            out.append((TokenRole.TEXT_FONT_SIZE, canonical_float(float(fs))))
        ff = canonical_font_family(style.get("fontName"))
        if ff:
            out.append((TokenRole.TEXT_FONT_FAMILY, ff))
        fw = canonical_font_weight(style.get("fontWeight"))
        if fw:
            out.append((TokenRole.TEXT_FONT_WEIGHT, fw))

    _add_paint_tokens(out, node.get("fills"), TokenRole.TEXT_COLOR, resolver)

    fs = resolver.resolve_numeric(node, "fontSize")
    if fs is None:
        tsid = node.get("textStyleId")
        if tsid:
            for style in envelope.get("textStyles") or []:
                if style.get("id") == tsid and isinstance(style.get("fontSize"), (int, float)):
                    fs = float(style["fontSize"])
                    break
    if fs is not None:
        out.append((TokenRole.TEXT_FONT_SIZE, canonical_float(fs)))

    ff = canonical_font_family(node.get("fontName"))
    if ff:
        out.append((TokenRole.TEXT_FONT_FAMILY, ff))
    fw = canonical_font_weight(node.get("fontWeight"))
    if fw:
        out.append((TokenRole.TEXT_FONT_WEIGHT, fw))

    for seg in node.get("styledSegments") or []:
        add_text_style_fields(seg.get("style") or {})

    return out


def _extract_geometry_tokens(node: TreeNode, resolver: VariableResolver) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []
    _add_paint_tokens(out, node.get("fills"), TokenRole.FILL_PAINT, resolver)
    _add_paint_tokens(out, node.get("strokes"), TokenRole.STROKE_PAINT, resolver)

    sw = node.get("strokeWeight")
    if isinstance(sw, (int, float)):
        out.append((TokenRole.STROKE_WEIGHT, canonical_float(float(sw))))

    for key in _CORNER_KEYS:
        val = node.get(key)
        if isinstance(val, (int, float)):
            out.append((TokenRole.CORNER_RADIUS, ("corner", key, round(float(val), 2))))

    for effect in node.get("effects") or []:
        canon = canonical_effect(effect)
        if canon:
            out.append((TokenRole.EFFECT, canon))

    return out


def _extract_layout_tokens(node: TreeNode, resolver: VariableResolver) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []
    if node.get("layoutMode") not in AUTO_LAYOUT_MODES:
        return out

    for prop, role in _LAYOUT_PROP_ROLES.items():
        val = resolver.resolve_numeric(node, prop)
        if val is not None:
            out.append((role, canonical_float(val)))

    for grid in node.get("layoutGrids") or []:
        canon = canonical_layout_grid(grid)
        if canon:
            out.append((TokenRole.LAYOUT_GRID, canon))

    return out


def extract_node_tokens(
    node: TreeNode,
    envelope: Envelope,
    resolver: VariableResolver | None = None,
) -> list[TokenOccurrence]:
    if resolver is None:
        resolver = VariableResolver(envelope)
    ntype = node.get("type")
    out: list[TokenOccurrence] = []

    if ntype == "TEXT":
        out.extend(_extract_text_tokens(node, resolver, envelope))
        return out

    out.extend(_extract_geometry_tokens(node, resolver))

    if ntype in ("FRAME", "SECTION", "COMPONENT", "INSTANCE"):
        _add_paint_tokens(out, node.get("backgrounds"), TokenRole.BACKGROUND_PAINT, resolver)
        out.extend(_extract_layout_tokens(node, resolver))

    return out


def value_to_display(value: CanonicalValue) -> str:
    return repr(value)
