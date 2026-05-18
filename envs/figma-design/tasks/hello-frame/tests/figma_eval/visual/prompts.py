from __future__ import annotations

from typing import Any


def build_visual_prompt(spec: dict[str, Any]) -> str:
    base = spec.get("instruction", "")
    mode = spec.get("mode")

    if mode == "relative_to_siblings":
        return (
            f"{base}\n\nCompare the focus element in the AFTER image to neighboring elements "
            "in the same region. Score how well it matches spacing, typography, color, and visual pattern."
        )
    if mode == "region_stable":
        return (
            f"{base}\n\nCompare BEFORE and AFTER images of the same region. The layout should "
            "remain coherent; score stability and quality of the update."
        )
    if mode == "match_asset":
        return (
            f"{base}\n\nCompare the GENERATED image to the REFERENCE image. "
            "Score fidelity, completeness, and polish."
        )
    return base
