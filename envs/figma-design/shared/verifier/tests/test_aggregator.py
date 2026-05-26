from figma_eval.aggregator import aggregate_scores, compute_completion_gate
from figma_eval.types import SubCheckResult


def test_aggregate_bounded_score():
    subchecks = [
        SubCheckResult("check.a", "checks", 1.0, True),
        SubCheckResult("gates.require_change", "gates", 1.0, True),
    ]
    report = aggregate_scores({"category_importance": {}}, subchecks, 1.0)
    assert 0 <= report.score <= 10


def test_completion_gate_failed_gate_caps_at_0_4():
    gate_results = [
        SubCheckResult("gates.no_detached_nodes", "gates", 0.0, True),
    ]
    gate = compute_completion_gate(gate_results, [], {})
    assert gate == 0.4


def test_completion_gate_required_check():
    check_results = [
        SubCheckResult("check.pricing", "checks", 0.5, True),
    ]
    gate = compute_completion_gate([], check_results, {"checks": [{"id": "pricing", "required": True}]})
    assert gate <= 0.3


def test_gates_excluded_from_raw():
    subchecks = [
        SubCheckResult("check.missing_scope", "checks", 0.0, False),
        SubCheckResult("gates.require_change", "gates", 1.0, True),
    ]
    report = aggregate_scores(
        {"category_importance": {"checks": 1.0}},
        subchecks,
        1.0,
    )
    assert report.raw == 0.0


def test_completion_gate_skips_not_applicable_required_check():
    check_results = [
        SubCheckResult("check.pricing", "checks", 0.0, False),
    ]
    gate = compute_completion_gate([], check_results, {"checks": [{"id": "pricing", "required": True}]})
    assert gate == 1.0


def test_checks_category_uses_only_applicable_items():
    subchecks = [
        SubCheckResult("check.a", "checks", 1.0, True),
        SubCheckResult("check.b", "checks", 0.0, False),
        SubCheckResult("gates.require_change", "gates", 1.0, True),
    ]
    report = aggregate_scores(
        {"category_importance": {"checks": 1.0}},
        subchecks,
        1.0,
    )
    assert report.raw == 1.0


def test_category_importance_normalized():
    subchecks = [
        SubCheckResult("check.a", "checks", 1.0, True),
        SubCheckResult("visual.v1", "visual", 0.0, True),
    ]
    report = aggregate_scores(
        {"category_importance": {"checks": 2.0, "visual": 2.0}},
        subchecks,
        1.0,
    )
    assert report.raw == 0.5


def test_subcheck_weight_affects_category_mean():
    subchecks = [
        SubCheckResult("check.a", "checks", 1.0, True, weight=2.0),
        SubCheckResult("check.b", "checks", 0.0, True, weight=1.0),
    ]
    report = aggregate_scores(
        {"category_importance": {"checks": 1.0}},
        subchecks,
        1.0,
    )
    assert abs(report.raw - 2 / 3) < 1e-9


def test_legacy_weights_key_still_works():
    subchecks = [
        SubCheckResult("check.a", "checks", 1.0, True),
        SubCheckResult("visual.v1", "visual", 1.0, True),
    ]
    report = aggregate_scores(
        {"weights": {"checks": 1.0, "visual": 3.0, "gates": 99.0}},
        subchecks,
        1.0,
    )
    assert report.raw == 1.0
