"""Tests for figma_eval visual judge (mocked LiteLLM)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from figma_eval.judge import parse_response, run_visual_judge


def test_parse_response_normalizes_dimensions():
    text = json.dumps(
        {
            "dimensions": {
                "spacing": 5,
                "typography": 4,
                "color": 5,
                "pattern": 4,
                "alignment": 5,
                "hierarchy": 4,
            },
            "mean_score": 0.9,
        }
    )
    out = parse_response(text)
    assert 0 <= out["mean_score"] <= 1
    assert "spacing" in out["dimensions"]


def test_parse_response_from_markdown_fence():
    text = '```json\n{"dimensions": {"spacing": 3}, "mean_score": 0.5}\n```'
    out = parse_response(text)
    assert out["mean_score"] == 0.5


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
