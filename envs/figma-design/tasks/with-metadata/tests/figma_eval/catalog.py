from __future__ import annotations

from .types import DesignCatalog, Envelope


def _collect_solid_colors(envelope: Envelope) -> list[dict[str, float]]:
    colors: list[dict[str, float]] = []
    seen: set[str] = set()

    def add(color: dict[str, float]) -> None:
        key = f"{color.get('r')},{color.get('g')},{color.get('b')}"
        if key not in seen:
            seen.add(key)
            colors.append(color)

    for ts in envelope.get("textStyles") or []:
        for fill in ts.get("fills") or []:
            if fill.get("type") == "SOLID":
                add(fill["color"])

    for ps in envelope.get("paintStyles") or []:
        for paint in ps.get("paints") or []:
            if paint.get("type") == "SOLID":
                add(paint["color"])

    return colors


def build_catalog(envelope: Envelope) -> DesignCatalog:
    component_ids = {c["id"] for c in envelope.get("components") or [] if c.get("id")}
    text_style_ids = {t["id"] for t in envelope.get("textStyles") or [] if t.get("id")}
    paint_style_ids = {p["id"] for p in envelope.get("paintStyles") or [] if p.get("id")}
    effect_style_ids = {e["id"] for e in envelope.get("effectStyles") or [] if e.get("id")}
    grid_style_ids = {g["id"] for g in envelope.get("gridStyles") or [] if g.get("id")}
    font_sizes: list[float] = []
    for ts in envelope.get("textStyles") or []:
        fs = ts.get("fontSize")
        if isinstance(fs, (int, float)):
            font_sizes.append(float(fs))

    return DesignCatalog(
        component_ids=component_ids,
        text_style_ids=text_style_ids,
        paint_style_ids=paint_style_ids,
        effect_style_ids=effect_style_ids,
        grid_style_ids=grid_style_ids,
        colors=_collect_solid_colors(envelope),
        font_sizes=font_sizes,
        has_text_styles=len(text_style_ids) > 0,
        has_variables=len(envelope.get("variableCollections") or []) > 0,
        has_components=len(component_ids) > 0,
    )


def component_exists(catalog: DesignCatalog, component_id: str) -> bool:
    return component_id in catalog.component_ids
