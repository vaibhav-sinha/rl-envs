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
