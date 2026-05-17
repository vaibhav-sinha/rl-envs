"""Tests for eval-llm judge (mocked LiteLLM)."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import judge  # noqa: E402


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
    out = judge._parse_response(text)
    assert 0 <= out["mean_score"] <= 1
    assert "spacing" in out["dimensions"]


def test_parse_response_from_markdown_fence():
    text = '```json\n{"dimensions": {"spacing": 3}, "mean_score": 0.5}\n```'
    out = judge._parse_response(text)
    assert out["mean_score"] == 0.5


@patch("judge._call_litellm")
def test_main_retries_on_bad_json(mock_call: MagicMock):
    mock_call.side_effect = [
        "not json",
        json.dumps({"dimensions": {"spacing": 4}, "mean_score": 0.75}),
    ]
    payload = {
        "model": "test/model",
        "prompt": "test",
        "images": [],
    }
    # Simulate stdin
    import io

    old_stdin = sys.stdin
    old_stdout = sys.stdout
    try:
        sys.stdin = io.StringIO(json.dumps(payload))
        buf = io.StringIO()
        sys.stdout = buf
        judge.main()
        result = json.loads(buf.getvalue())
        assert result["mean_score"] == 0.75
        assert mock_call.call_count == 2
    finally:
        sys.stdin = old_stdin
        sys.stdout = old_stdout
