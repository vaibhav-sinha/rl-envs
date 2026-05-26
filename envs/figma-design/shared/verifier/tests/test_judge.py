"""Tests for figma_eval visual judge (mocked LiteLLM)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from figma_eval.judge import (
    aggregate_good_design_score,
    parse_criteria_scores,
    parse_good_design_scores,
    parse_numeric_score,
    parse_preference_score,
    parse_response,
    parse_task_completeness,
    run_llm_judge,
    run_visual_judge,
)


def test_parse_criteria_scores_combines_consistency_and_fit():
    text = json.dumps(
        {
            "consistency_scores": {"typography": 5, "spacing": 4},
            "fit_scores": {"layout_fit": 3},
        }
    )
    out = parse_criteria_scores(
        text,
        consistency_keys=["typography", "spacing"],
        fit_keys=["layout_fit"],
    )
    assert out["mean_score"] > 0
    assert "typography" in out["consistency_scores"]
    assert "layout_fit" in out["fit_scores"]


def test_parse_criteria_scores_extracts_explanations():
    text = json.dumps(
        {
            "scores": {"typography": 3, "spacing": 4},
            "explanations": {
                "typography": "Body text is too small.",
                "spacing": "Padding is consistent.",
            },
        }
    )
    out = parse_criteria_scores(
        text,
        consistency_keys=["typography", "spacing"],
        scores_key="scores",
        explanations_key="explanations",
    )
    assert out["explanations"]["typography"] == "Body text is too small."
    assert out["explanations"]["spacing"] == "Padding is consistent."


def test_parse_task_completeness_boolean_legacy():
    text = json.dumps({"completed": True, "requirements": []})
    out = parse_task_completeness(text)
    assert out["mean_score"] == 1.0

    text_fail = json.dumps({"completed": False, "requirements": []})
    out_fail = parse_task_completeness(text_fail)
    assert out_fail["mean_score"] == 0.0


def test_parse_task_completeness_splits_structure_and_quality():
    text = json.dumps(
        {
            "requirements": [
                {
                    "description": "Sale section exists",
                    "present": True,
                    "quality_acceptable": False,
                },
                {
                    "description": "Horizontal slider",
                    "present": True,
                    "quality_acceptable": True,
                },
            ],
            "structurally_complete": True,
            "quality_acceptable": False,
            "completed": False,
        }
    )
    out = parse_task_completeness(text)
    assert out["structurally_complete"] is True
    assert out["quality_acceptable"] is False
    assert out["completed"] is False
    assert out["mean_score"] == pytest.approx(0.5)
    assert out["requirements"][0]["satisfied"] is False


def test_parse_task_completeness_preserves_explanations():
    text = json.dumps(
        {
            "requirements": [
                {
                    "description": "Sale section exists",
                    "present": True,
                    "quality_acceptable": False,
                    "explanation": "  Placeholder block instead of real content.  ",
                },
            ],
            "completed": False,
        }
    )
    out = parse_task_completeness(text)
    assert out["requirements"][0]["explanation"] == (
        "Placeholder block instead of real content."
    )


def test_aggregate_good_design_score_caps_severe_placeholder_defect():
    scores = {
        "no_placeholders_or_broken_media": 0.0,
        "layout_proportions": 0.0,
        "layout_completeness": 0.0,
        "typography": 1.0,
        "spacing": 1.0,
        "color": 1.0,
        "content_not_overflowing": 0.75,
        "alignment": 1.0,
        "visual_hierarchy": 1.0,
    }
    out = aggregate_good_design_score(
        scores,
        defect_keys=[
            "no_placeholders_or_broken_media",
            "layout_proportions",
            "layout_completeness",
        ],
        quality_keys=[
            "typography",
            "spacing",
            "color",
            "content_not_overflowing",
            "alignment",
            "visual_hierarchy",
        ],
        severe_defect_keys=["no_placeholders_or_broken_media"],
    )
    assert out["defect_min"] == 0.0
    assert out["quality_mean"] > 0.8
    assert out["mean_score"] == pytest.approx(0.4)


def test_aggregate_good_design_score_partial_defect_not_zeroed():
    """One severe placeholder defect with strong quality dims should cap at 0.4, not 0."""
    scores = {
        "no_placeholders_or_broken_media": 0.0,
        "layout_proportions": 0.5,
        "layout_completeness": 0.5,
        "typography": 0.75,
        "spacing": 0.75,
        "color": 0.75,
        "content_not_overflowing": 1.0,
        "alignment": 1.0,
        "visual_hierarchy": 0.75,
    }
    out = aggregate_good_design_score(
        scores,
        defect_keys=[
            "no_placeholders_or_broken_media",
            "layout_proportions",
            "layout_completeness",
        ],
        quality_keys=[
            "typography",
            "spacing",
            "color",
            "content_not_overflowing",
            "alignment",
            "visual_hierarchy",
        ],
        severe_defect_keys=["no_placeholders_or_broken_media"],
    )
    assert out["defect_mean"] == pytest.approx(1 / 3)
    assert out["quality_mean"] == pytest.approx(5 / 6)
    assert out["mean_score"] == pytest.approx(0.4)


def test_parse_good_design_scores_uses_weighted_blend_with_severe_cap():
    text = json.dumps(
        {
            "scores": {
                "no_placeholders_or_broken_media": 1,
                "layout_proportions": 2,
                "layout_completeness": 2,
                "typography": 5,
                "spacing": 5,
                "color": 5,
                "content_not_overflowing": 4,
                "alignment": 5,
                "visual_hierarchy": 5,
            },
            "explanations": {
                "no_placeholders_or_broken_media": "Large red placeholder block.",
            },
        }
    )
    out = parse_good_design_scores(text)
    assert out["defect_min"] == pytest.approx(0.0)
    assert out["mean_score"] <= 0.4


def test_parse_preference_score_normalizes():
    text = json.dumps({"preference_score": 7})
    out = parse_preference_score(text)
    assert out["preference_score"] == 7.0
    assert out["mean_score"] == pytest.approx(0.7)


def test_parse_numeric_score_normalizes_to_unit_interval():
    text = json.dumps({"score": 7})
    out = parse_numeric_score(text, scale=10)
    assert out["mean_score"] == pytest.approx(0.7)


def test_parse_numeric_score_extracts_explanation():
    text = json.dumps({"score": 8, "explanation": "  New paint styles were created.  "})
    out = parse_numeric_score(text, scale=10)
    assert out["mean_score"] == pytest.approx(0.8)
    assert out["explanation"] == "New paint styles were created."


def test_parse_numeric_score_omits_blank_explanation():
    text = json.dumps({"score": 8, "explanation": "   "})
    out = parse_numeric_score(text, scale=10)
    assert "explanation" not in out


def test_parse_response_from_markdown_fence():
    text = '```json\n{"dimensions": {"spacing": 3}, "mean_score": 0.5}\n```'
    out = parse_response(text)
    assert 0 <= out["mean_score"] <= 1


@patch("figma_eval.judge._call_litellm")
def test_run_llm_judge_retries_on_bad_json(mock_call: MagicMock):
    mock_call.side_effect = [
        "not json",
        json.dumps({"consistency_scores": {"typography": 4}, "fit_scores": {}}),
    ]
    result = run_llm_judge(
        prompt="test",
        images=[],
        model="test/model",
        num_retries=1,
        parse_fn=lambda t: parse_criteria_scores(t, consistency_keys=["typography"]),
        retry_hint="json only",
    )
    assert result["mean_score"] > 0
    assert mock_call.call_count == 2


@patch("figma_eval.judge._call_litellm")
def test_run_visual_judge_retries_on_bad_json(mock_call: MagicMock):
    mock_call.side_effect = [
        "not json",
        json.dumps({"dimensions": {"spacing": 4}, "mean_score": 0.75}),
    ]
    result = run_visual_judge(
        prompt="test",
        images=[],
        model="test/model",
        num_retries=1,
    )
    assert result["mean_score"] == 0.75
    assert mock_call.call_count == 2
