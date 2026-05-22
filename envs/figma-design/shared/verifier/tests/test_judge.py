"""Tests for figma_eval visual judge (mocked LiteLLM)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from figma_eval.judge import (
    parse_criteria_scores,
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


def test_parse_task_completeness_boolean():
    text = json.dumps({"completed": True, "requirements": []})
    out = parse_task_completeness(text)
    assert out["mean_score"] == 1.0

    text_fail = json.dumps({"completed": False, "requirements": []})
    out_fail = parse_task_completeness(text_fail)
    assert out_fail["mean_score"] == 0.0


def test_parse_preference_score_normalizes():
    text = json.dumps({"preference_score": 7})
    out = parse_preference_score(text)
    assert out["preference_score"] == 7.0
    assert out["mean_score"] == pytest.approx(0.7)


def test_parse_numeric_score_normalizes_to_unit_interval():
    text = json.dumps({"score": 7})
    out = parse_numeric_score(text, scale=10)
    assert out["mean_score"] == pytest.approx(0.7)


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
