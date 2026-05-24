from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .edit_graph import changed_node_ids
from .tree import (
    added_frames_under_same_parent,
    added_top_level_frame_ids,
    largest_added_frame_id,
    largest_changed_frame_id,
    largest_frame_among_changes,
    minimal_enclosing_for_changes,
    modified_top_level_frame_ids,
    resolve_config_node_id,
    resolve_config_node_ids,
    topmost_added_frame_ids,
)
from .types import EditGraph, Envelope

STRATEGIES = frozenset(
    {
        "auto",
        "explicit",
        "largest_added_frame",
        "largest_added_under",
        "largest_changed_frame",
        "minimal_enclosing",
        "all_added_frames",
    }
)


@dataclass
class ScreenshotTarget:
    node_ids: list[str]
    composite: bool
    strategy: str
    auto_step: int | None = None
    details: dict[str, Any] = field(default_factory=dict)


def _resolve_under_roots(
    envelope: Envelope,
    screenshot_config: dict[str, Any] | None,
    gates: dict[str, Any] | None,
) -> list[str] | None:
    under = (screenshot_config or {}).get("under")
    if under:
        resolved = resolve_config_node_id(envelope, under)
        return [resolved] if resolved else None
    allowed = (gates or {}).get("allowed_change_inside_ids")
    if allowed:
        resolved = resolve_config_node_ids(envelope, allowed)
        return resolved or None
    return None


def _resolve_explicit_ids(
    envelope: Envelope,
    *,
    spec: dict[str, Any],
    screenshot_config: dict[str, Any] | None,
) -> list[str] | None:
    raw_ids: list[str] = []
    per_check = spec.get("node_id")
    if per_check:
        raw_ids.append(str(per_check))
    if not raw_ids and screenshot_config:
        if screenshot_config.get("node_id"):
            raw_ids.append(str(screenshot_config["node_id"]))
        for nid in screenshot_config.get("node_ids") or []:
            raw_ids.append(str(nid))
    if not raw_ids:
        return None
    resolved: list[str] = []
    for ref in raw_ids:
        hfc_id = resolve_config_node_id(envelope, ref)
        if hfc_id:
            resolved.append(hfc_id)
    return resolved or None


def _target_from_ids(
    node_ids: list[str],
    *,
    strategy: str,
    composite: bool = False,
    auto_step: int | None = None,
    details: dict[str, Any] | None = None,
) -> ScreenshotTarget:
    use_composite = composite and len(node_ids) >= 2
    return ScreenshotTarget(
        node_ids=node_ids,
        composite=use_composite,
        strategy=strategy,
        auto_step=auto_step,
        details=details or {},
    )


def _resolve_auto(
    *,
    envelope: Envelope,
    before: Envelope,
    graph: EditGraph,
    screenshot_config: dict[str, Any] | None,
    gates: dict[str, Any] | None,
    spec: dict[str, Any],
) -> ScreenshotTarget | None:
    if not changed_node_ids(graph):
        return None

    composite_flag = bool((screenshot_config or {}).get("composite", False))
    under_roots = _resolve_under_roots(envelope, screenshot_config, gates)
    allowed_root_refs = (gates or {}).get("allowed_change_inside_ids")

    # Step 1: explicit node_id(s)
    explicit_ids = _resolve_explicit_ids(
        envelope, spec=spec, screenshot_config=screenshot_config
    )
    if explicit_ids:
        return _target_from_ids(
            explicit_ids,
            strategy="explicit",
            composite=len(explicit_ids) >= 2,
            auto_step=1,
        )

    # Step 2: exactly 1 added top-level frame
    added_top = added_top_level_frame_ids(envelope, graph)
    if len(added_top) == 1:
        return _target_from_ids(added_top, strategy="auto", auto_step=2)

    # Step 3: exactly 1 modified top-level frame
    modified_top = modified_top_level_frame_ids(envelope, graph)
    if len(modified_top) == 1:
        return _target_from_ids(modified_top, strategy="auto", auto_step=3)

    # Step 4: allowed region — largest added inside, else largest changed inside
    if under_roots:
        added_inside = largest_added_frame_id(envelope, graph, under_roots=under_roots)
        if added_inside:
            return _target_from_ids([added_inside], strategy="auto", auto_step=4)
        changed_inside = largest_changed_frame_id(
            envelope, graph, under_roots=under_roots
        )
        if changed_inside:
            return _target_from_ids([changed_inside], strategy="auto", auto_step=4)

    # Step 5: multiple added frames under same parent
    sibling_group = added_frames_under_same_parent(envelope, graph)
    if sibling_group is not None:
        _parent_id, siblings = sibling_group
        if composite_flag:
            return _target_from_ids(
                siblings,
                strategy="auto",
                composite=True,
                auto_step=5,
            )
        minimal = minimal_enclosing_for_changes(envelope, graph)
        if minimal:
            return _target_from_ids([minimal], strategy="auto", auto_step=5)

    # Step 6: fallback largest frame among all changes
    fallback = largest_frame_among_changes(
        envelope,
        before,
        graph,
        allowed_root_ids=allowed_root_refs,
    )
    if fallback:
        return _target_from_ids([fallback], strategy="auto", auto_step=6)
    return None


def _resolve_named_strategy(
    strategy: str,
    *,
    envelope: Envelope,
    before: Envelope,
    graph: EditGraph,
    screenshot_config: dict[str, Any],
    gates: dict[str, Any] | None,
) -> ScreenshotTarget | None:
    under_roots = _resolve_under_roots(envelope, screenshot_config, gates)

    if strategy == "explicit":
        ids: list[str] = []
        if screenshot_config.get("node_id"):
            hfc = resolve_config_node_id(envelope, str(screenshot_config["node_id"]))
            if hfc:
                ids.append(hfc)
        for ref in screenshot_config.get("node_ids") or []:
            hfc = resolve_config_node_id(envelope, str(ref))
            if hfc:
                ids.append(hfc)
        if not ids:
            return None
        return _target_from_ids(ids, strategy="explicit", composite=len(ids) >= 2)

    if strategy == "largest_added_frame":
        nid = largest_added_frame_id(
            envelope, graph, top_level_only=True
        )
        return _target_from_ids([nid], strategy=strategy) if nid else None

    if strategy == "largest_added_under":
        nid = largest_added_frame_id(envelope, graph, under_roots=under_roots)
        return _target_from_ids([nid], strategy=strategy) if nid else None

    if strategy == "largest_changed_frame":
        nid = largest_changed_frame_id(envelope, graph, under_roots=under_roots)
        return _target_from_ids([nid], strategy=strategy) if nid else None

    if strategy == "minimal_enclosing":
        nid = minimal_enclosing_for_changes(
            envelope, graph, under_roots=under_roots
        )
        return _target_from_ids([nid], strategy=strategy) if nid else None

    if strategy == "all_added_frames":
        frames = topmost_added_frame_ids(envelope, graph, under_roots=under_roots)
        if not frames:
            return None
        return _target_from_ids(
            frames,
            strategy=strategy,
            composite=len(frames) >= 2,
        )

    return None


def resolve_screenshot_target(
    *,
    screenshot_config: dict[str, Any] | None,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    gates: dict[str, Any] | None,
) -> ScreenshotTarget | None:
    """Resolve screenshot node target(s) for a visual check."""
    strategy = (screenshot_config or {}).get("strategy", "auto")

    # Per-check node_id overrides task strategy (treated as explicit).
    if spec.get("node_id"):
        explicit_ids = _resolve_explicit_ids(
            after, spec=spec, screenshot_config=None
        )
        if explicit_ids:
            return _target_from_ids(
                explicit_ids,
                strategy="explicit",
                composite=len(explicit_ids) >= 2,
            )

    if strategy == "auto" or strategy not in STRATEGIES:
        return _resolve_auto(
            envelope=after,
            before=before,
            graph=graph,
            screenshot_config=screenshot_config,
            gates=gates,
            spec=spec,
        )

    if not screenshot_config:
        return None
    return _resolve_named_strategy(
        strategy,
        envelope=after,
        before=before,
        graph=graph,
        screenshot_config=screenshot_config,
        gates=gates,
    )


def screenshot_target_details(target: ScreenshotTarget) -> dict[str, Any]:
    """Build details dict for visual check results."""
    details = dict(target.details)
    details["screenshot_node_ids"] = target.node_ids
    details["screenshot_node_id"] = target.node_ids[0] if target.node_ids else None
    details["screenshot_composite"] = target.composite
    details["screenshot_strategy"] = target.strategy
    if target.auto_step is not None:
        details["screenshot_auto_step"] = target.auto_step
    return details
