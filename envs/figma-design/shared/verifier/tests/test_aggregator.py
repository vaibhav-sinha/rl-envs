from figma_eval.aggregator import aggregate_scores, compute_completion_gate
from figma_eval.types import SubCheckResult


def test_aggregate_bounded_score():
    subchecks = [
        SubCheckResult("check.a", "checks", 1.0, True),
        SubCheckResult("gates.require_change", "gates", 1.0, True),
    ]
    report = aggregate_scores({"weights": {}}, subchecks, 1.0)
    assert 0 <= report.score <= 10


def test_completion_gate_required_check():
    check_results = [
        SubCheckResult("check.pricing", "checks", 0.5, True),
    ]
    gate = compute_completion_gate([], check_results, {"checks": [{"id": "pricing", "required": True}]})
    assert gate <= 0.3


def test_checks_category_omitted_when_all_not_applicable():
    subchecks = [
        SubCheckResult("check.missing_scope", "checks", 0.0, False),
        SubCheckResult("gates.require_change", "gates", 1.0, True),
    ]
    report = aggregate_scores(
        {"weights": {"gates": 1.0, "checks": 0.5}},
        subchecks,
        1.0,
    )
    assert report.raw == 1.0


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
        {"weights": {"gates": 1.0, "checks": 1.0}},
        subchecks,
        1.0,
    )
    assert report.raw == 1.0
