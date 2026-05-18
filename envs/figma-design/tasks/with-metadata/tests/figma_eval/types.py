from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

CanonicalValue = tuple[Any, ...]

CheckType = Literal[
    "must_contain_text",
    "must_contain_image",
    "min_added_under",
    "min_modified_under",
    "component_instances_under",
    "metadata_only_under",
    "property_on_node",
]

CheckScope = Literal["node_id", "new_frames"]

VisualCheckType = Literal[
    "design_consistency",
    "task_completeness",
    "before_vs_after",
    "diff",
    "compare_with_reference",
]
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
    has_text_styles: bool
    has_variables: bool
    has_components: bool
    allowlists: dict[str, set[CanonicalValue]] = field(default_factory=dict)
    bindable_by_role: dict[str, set[CanonicalValue]] = field(default_factory=dict)

    @property
    def has_allowlists(self) -> bool:
        return any(bool(v) for v in self.allowlists.values())

    @property
    def has_bindable_tokens(self) -> bool:
        return any(bool(v) for v in self.bindable_by_role.values())


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
