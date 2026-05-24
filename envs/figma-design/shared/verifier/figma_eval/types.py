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
    "good_design",
    "design_consistency",
    "design_fit",
    "task_completeness",
    "design_preference",
]
MetadataCheckType = Literal["diff"]
SubCheckCategory = Literal[
    "gates",
    "checks",
    "design_system",
    "visual",
    "heuristics",
    "commands",
    "metadata",
]

DEFAULT_CATEGORY_IMPORTANCE = {
    "commands": 0.15,
    "checks": 0.35,
    "design_system": 0.2,
    "visual": 0.35,
    "heuristics": 0.1,
    "metadata": 0.1,
}

SCORING_CATEGORIES: tuple[SubCheckCategory, ...] = (
    "commands",
    "checks",
    "design_system",
    "visual",
    "heuristics",
    "metadata",
)

# Default relative weights for visual LLM checks (overridable per check in eval-spec).
DEFAULT_VISUAL_CHECK_WEIGHTS: dict[str, float] = {
    "task_completeness": 8.0,
    "design_preference": 3.0,
    "design_consistency": 2.0,
    "good_design": 1.0,
    "design_fit": 2.0,
}


def subcheck_weight_from_spec(spec: dict[str, Any], *, default: float = 1.0) -> float:
    """Per-subcheck weight from eval-spec; uses *default* when weight is omitted."""
    if "weight" not in spec:
        return default
    raw = spec["weight"]
    try:
        w = float(raw)
    except (TypeError, ValueError):
        return default
    return w if w > 0 else default


def visual_subcheck_weight_from_spec(spec: dict[str, Any]) -> float:
    """Visual check weight: type-specific default, overridable via eval-spec ``weight``."""
    check_type = str(spec.get("type", ""))
    type_default = DEFAULT_VISUAL_CHECK_WEIGHTS.get(check_type, 1.0)
    return subcheck_weight_from_spec(spec, default=type_default)

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
