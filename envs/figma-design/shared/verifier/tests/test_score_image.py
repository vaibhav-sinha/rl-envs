from pathlib import Path
from unittest.mock import patch

import pytest

from figma_eval.visual.score_image import (
    load_criteria_file,
    load_visual_check_from_spec,
    score_image,
)


def test_load_criteria_file_json_array(tmp_path):
    path = tmp_path / "criteria.json"
    path.write_text('["One", "Two"]', encoding="utf-8")
    assert load_criteria_file(path) == ["One", "Two"]


def test_load_criteria_file_plain_text(tmp_path):
    path = tmp_path / "criteria.txt"
    path.write_text("Alpha\n\nBeta\n", encoding="utf-8")
    assert load_criteria_file(path) == ["Alpha", "Beta"]


def test_load_visual_check_from_spec(tmp_path):
    spec_path = tmp_path / "eval-spec.json"
    spec_path.write_text(
        '{"visual": [{"id": "gd1", "type": "good_design"}]}',
        encoding="utf-8",
    )
    check = load_visual_check_from_spec(spec_path, "gd1")
    assert check["type"] == "good_design"


@patch("figma_eval.visual.score_image.run_llm_judge")
def test_score_image_good_design(mock_judge, tmp_path):
    image = tmp_path / "shot.png"
    image.write_bytes(b"png")
    mock_judge.return_value = {
        "mean_score": 0.5,
        "consistency_scores": {"typography": 0.5},
        "explanations": {"typography": "Weak hierarchy."},
    }
    result = score_image(
        image=image,
        check_type="good_design",
        task_instruction="Add a sale section.",
        model="test-model",
    )
    assert result["check_type"] == "good_design"
    assert result["score"] == 0.5
    assert result["scores"]["typography"] == 0.5
    mock_judge.assert_called_once()


@patch("figma_eval.visual.score_image.run_llm_judge")
def test_score_image_design_consistency(mock_judge, tmp_path):
    agent = tmp_path / "agent.png"
    ref = tmp_path / "ref.png"
    agent.write_bytes(b"agent")
    ref.write_bytes(b"ref")
    mock_judge.return_value = {
        "mean_score": 0.25,
        "consistency_scores": {"criterion_0": 0.25},
        "explanations": {"criterion_0": "Placeholder block."},
    }
    result = score_image(
        image=agent,
        check_type="design_consistency",
        task_instruction="Match reference.",
        model="test-model",
        reference=ref,
        criteria=["No placeholder blocks"],
    )
    assert result["score"] == 0.25
    images = mock_judge.call_args.kwargs["images"]
    assert {img["role"] for img in images} == {"reference", "agent"}


def test_score_image_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        score_image(
            image=tmp_path / "missing.png",
            check_type="good_design",
            task_instruction="Task",
            model="test",
        )
