from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

CheckType = Literal[
    "node_exists",
    "min_added_under",
    "min_modified_under",
    "component_instances_under",
    "metadata_only_under",
    "property_on_node",
]

VisualMode = Literal["relative_to_siblings", "region_stable", "match_asset"]
VisualFocus = Literal["largest_added", "added", "all"]
SubCheckCategory = Literal["gates", "checks", "design_system", "visual", "heuristics"]

DEFAULT_WEIGHTS = {
    "gates": 1.0,
    "checks": 0.35,
    "design_system": 0.2,
    "visual": 0.35,
    "heuristics": 0.1,
}

METADATA_PROPERTY_KEYS = frozenset(
    {"name", "pluginData", "description", "locked", "exportSettings", "reactions"}
)

Envelope = dict[str, Any]
TreeNode = dict[str, Any]


@dataclass
class NodeChange:
    node_id: str
    operation: Literal["add", "delete", "modify", "reparent", "replace"]
    changed_properties: list[str] | None = None


@dataclass
class EditGraph:
    equal: bool
    changes: list[NodeChange]
    added_ids: set[str]
    deleted_ids: set[str]
    modified_ids: set[str]


@dataclass
class DesignCatalog:
    component_ids: set[str]
    text_style_ids: set[str]
    paint_style_ids: set[str]
    effect_style_ids: set[str]
    grid_style_ids: set[str]
    colors: list[dict[str, float]]
    font_sizes: list[float]
    has_text_styles: bool
    has_variables: bool
    has_components: bool


@dataclass
class SubCheckResult:
    id: str
    category: SubCheckCategory
    score: float
    applicable: bool
    weight: float = 1.0
    details: dict[str, Any] | None = None


@dataclass
class EvalReport:
    score: float
    completion_gate: float
    raw: float
    subchecks: list[SubCheckResult]
    summary: str | None = None
