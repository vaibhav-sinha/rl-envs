from figma_eval.types import (
    DEFAULT_VISUAL_CHECK_WEIGHTS,
    subcheck_weight_from_spec,
    visual_subcheck_weight_from_spec,
)


def test_default_visual_weights():
    assert DEFAULT_VISUAL_CHECK_WEIGHTS["task_completeness"] == 8.0
    assert DEFAULT_VISUAL_CHECK_WEIGHTS["design_preference"] == 3.0
    assert DEFAULT_VISUAL_CHECK_WEIGHTS["design_consistency"] == 2.0
    assert DEFAULT_VISUAL_CHECK_WEIGHTS["good_design"] == 1.0


def test_visual_subcheck_weight_uses_type_default():
    assert visual_subcheck_weight_from_spec({"type": "task_completeness"}) == 8.0
    assert visual_subcheck_weight_from_spec({"type": "good_design"}) == 1.0
    assert visual_subcheck_weight_from_spec({"type": "design_fit"}) == 2.0


def test_visual_subcheck_weight_eval_spec_override():
    spec = {"type": "task_completeness", "weight": 10}
    assert visual_subcheck_weight_from_spec(spec) == 10.0


def test_visual_subcheck_weight_unknown_type_defaults_to_one():
    assert visual_subcheck_weight_from_spec({"type": "unknown_check"}) == 1.0


def test_non_visual_subcheck_weight_still_defaults_to_one():
    assert subcheck_weight_from_spec({"id": "check.a", "type": "must_contain_text"}) == 1.0
    assert subcheck_weight_from_spec({"id": "check.a", "weight": 2}) == 2.0
