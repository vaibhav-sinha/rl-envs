from figma_eval.report import build_eval_details, format_subcheck_entry
from figma_eval.types import SubCheckResult


def test_format_subcheck_entry_reward():
    entry = format_subcheck_entry(
        SubCheckResult(
            id="check.foo",
            category="checks",
            score=0.8,
            applicable=True,
            details={"count": 2},
        )
    )
    assert entry == {
        "id": "check.foo",
        "category": "checks",
        "reward": 0.8,
        "details": {"count": 2},
    }


def test_format_subcheck_entry_skipped():
    entry = format_subcheck_entry(
        SubCheckResult(
            id="design_system.tokens",
            category="design_system",
            score=0.0,
            applicable=False,
        )
    )
    assert entry == {
        "id": "design_system.tokens",
        "category": "design_system",
        "skipped": True,
    }


def test_build_eval_details_groups_categories():
    subchecks = [
        SubCheckResult(id="gates.require_change", category="gates", score=1.0, applicable=True),
        SubCheckResult(id="check.added", category="checks", score=0.5, applicable=True),
        SubCheckResult(
            id="design_system.unused",
            category="design_system",
            score=0.0,
            applicable=False,
        ),
    ]
    details = build_eval_details(
        score_0_10=7.5,
        completion_gate=1.0,
        raw=0.75,
        subchecks=subchecks,
    )
    assert details["reward"] == 0.75
    assert details["score_0_10"] == 7.5
    assert details["categories"]["gates"]["reward"] == 1.0
    assert details["categories"]["checks"]["reward"] == 0.5
    assert details["categories"]["design_system"]["checks"][0]["skipped"] is True
    assert "reward" not in details["categories"]["design_system"]
    assert len(details["checks"]) == 3
