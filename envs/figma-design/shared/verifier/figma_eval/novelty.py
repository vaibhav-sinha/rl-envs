from __future__ import annotations

from typing import Any

# UI property key -> TokenRole.value (must match novelty-catalog.ts)
_PROPERTY_TO_ROLES: dict[str, dict[str, list[str]]] = {
    "text": {
        "color": ["text_color"],
        "font_size": ["text_font_size"],
        "font_family": ["text_font_family"],
        "font_weight": ["text_font_weight"],
    },
    "frames": {
        "fill": ["fill_paint"],
        "background": ["background_paint"],
        "stroke_color": ["stroke_paint"],
        "stroke_width": ["stroke_weight"],
        "corner_radius": ["corner_radius"],
        "effects": ["effect"],
        "item_spacing": ["layout_item_spacing"],
        "counter_axis_spacing": ["layout_counter_axis_spacing"],
        "padding": [
            "layout_padding_left",
            "layout_padding_right",
            "layout_padding_top",
            "layout_padding_bottom",
        ],
        "layout_grid": ["layout_grid"],
    },
}

NOVELTY_CATEGORIES = (
    {
        "id": "text",
        "label": "Text",
        "properties": list(_PROPERTY_TO_ROLES["text"].keys()),
    },
    {
        "id": "frames",
        "label": "Frames",
        "properties": list(_PROPERTY_TO_ROLES["frames"].keys()),
    },
)


def resolve_allowed_roles(ds_spec: dict[str, Any] | None) -> set[str]:
    """Token roles for which allowlist enforcement is skipped."""
    if not ds_spec:
        return set()
    raw = ds_spec.get("allow_novelty")
    if not isinstance(raw, dict):
        return set()

    allowed: set[str] = set()
    for category, props in _PROPERTY_TO_ROLES.items():
        section = raw.get(category)
        if not isinstance(section, dict):
            continue
        for prop_key, roles in props.items():
            if section.get(prop_key) is True:
                allowed.update(roles)
    return allowed
