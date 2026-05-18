from __future__ import annotations

from .tokens import (
    TokenOccurrence,
    TokenRole,
    VariableResolver,
    canonical_color,
    canonical_effect,
    canonical_float,
    canonical_font_family,
    canonical_font_weight,
    canonical_layout_grid,
    canonical_paint,
    extract_node_tokens,
)
from .tree import find_all_nodes
from .types import CanonicalValue, DesignCatalog, Envelope, TreeNode


def _role_key(role: TokenRole) -> str:
    return role.value


def _add_to_set(target: dict[str, set[CanonicalValue]], role: TokenRole, value: CanonicalValue) -> None:
    key = _role_key(role)
    target.setdefault(key, set()).add(value)


def _merge_occurrences(
    target: dict[str, set[CanonicalValue]], occurrences: list[TokenOccurrence]
) -> None:
    for role, value in occurrences:
        _add_to_set(target, role, value)


def _tokens_from_text_style(style: TreeNode, resolver: VariableResolver) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []
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
    return out


def _tokens_from_paint_style(style: TreeNode, resolver: VariableResolver) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []
    for paint in style.get("paints") or []:
        canon = canonical_paint(paint, resolver)
        if canon:
            out.append((TokenRole.FILL_PAINT, canon))
            out.append((TokenRole.STROKE_PAINT, canon))
    return out


def _tokens_from_effect_style(style: TreeNode) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []
    for effect in style.get("effects") or []:
        canon = canonical_effect(effect)
        if canon:
            out.append((TokenRole.EFFECT, canon))
    return out


def _tokens_from_grid_style(style: TreeNode) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []
    for grid in style.get("layoutGrids") or []:
        canon = canonical_layout_grid(grid)
        if canon:
            out.append((TokenRole.LAYOUT_GRID, canon))
    return out


def _tokens_from_variable_value(raw: dict[str, object]) -> list[TokenOccurrence]:
    out: list[TokenOccurrence] = []
    vtype = raw.get("type")
    if vtype == "COLOR" and isinstance(raw.get("color"), dict):
        canon: CanonicalValue = ("paint", "SOLID", canonical_color(raw["color"]))
        for role in (
            TokenRole.TEXT_COLOR,
            TokenRole.FILL_PAINT,
            TokenRole.BACKGROUND_PAINT,
            TokenRole.STROKE_PAINT,
        ):
            out.append((role, canon))
    elif vtype == "FLOAT" and isinstance(raw.get("value"), (int, float)):
        fv = canonical_float(float(raw["value"]))
        for role in (
            TokenRole.TEXT_FONT_SIZE,
            TokenRole.LAYOUT_ITEM_SPACING,
            TokenRole.LAYOUT_COUNTER_AXIS_SPACING,
            TokenRole.LAYOUT_PADDING_LEFT,
            TokenRole.LAYOUT_PADDING_RIGHT,
            TokenRole.LAYOUT_PADDING_TOP,
            TokenRole.LAYOUT_PADDING_BOTTOM,
            TokenRole.STROKE_WEIGHT,
            TokenRole.CORNER_RADIUS,
        ):
            out.append((role, fv))
    return out


def _build_bindable(envelope: Envelope, resolver: VariableResolver) -> dict[str, set[CanonicalValue]]:
    bindable: dict[str, set[CanonicalValue]] = {}

    for ts in envelope.get("textStyles") or []:
        _merge_occurrences(bindable, _tokens_from_text_style(ts, resolver))

    for ps in envelope.get("paintStyles") or []:
        _merge_occurrences(bindable, _tokens_from_paint_style(ps, resolver))

    for es in envelope.get("effectStyles") or []:
        _merge_occurrences(bindable, _tokens_from_effect_style(es))

    for gs in envelope.get("gridStyles") or []:
        _merge_occurrences(bindable, _tokens_from_grid_style(gs))

    for raw in resolver._values.values():
        _merge_occurrences(bindable, _tokens_from_variable_value(raw))

    return bindable


def build_catalog(envelope: Envelope) -> DesignCatalog:
    component_ids = {c["id"] for c in envelope.get("components") or [] if c.get("id")}
    text_style_ids = {t["id"] for t in envelope.get("textStyles") or [] if t.get("id")}
    paint_style_ids = {p["id"] for p in envelope.get("paintStyles") or [] if p.get("id")}
    effect_style_ids = {e["id"] for e in envelope.get("effectStyles") or [] if e.get("id")}
    grid_style_ids = {g["id"] for g in envelope.get("gridStyles") or [] if g.get("id")}

    resolver = VariableResolver(envelope)
    allowlists: dict[str, set[CanonicalValue]] = {}

    for node in find_all_nodes(envelope):
        _merge_occurrences(allowlists, extract_node_tokens(node, envelope, resolver))

    bindable = _build_bindable(envelope, resolver)

    return DesignCatalog(
        component_ids=component_ids,
        text_style_ids=text_style_ids,
        paint_style_ids=paint_style_ids,
        effect_style_ids=effect_style_ids,
        grid_style_ids=grid_style_ids,
        has_text_styles=len(text_style_ids) > 0,
        has_variables=len(envelope.get("variableCollections") or []) > 0,
        has_components=len(component_ids) > 0,
        allowlists=allowlists,
        bindable_by_role=bindable,
    )


def component_exists(catalog: DesignCatalog, component_id: str) -> bool:
    return component_id in catalog.component_ids
