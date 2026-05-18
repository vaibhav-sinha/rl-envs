import json
from pathlib import Path
from unittest.mock import patch

import pytest

from figma_eval.edit_graph import build_edit_graph
from figma_eval.visual.run_visual import run_visual_check


@patch("figma_eval.visual.run_visual.render_node_or_error")
def test_render_failure_scores_zero(mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    mock_render.return_value = "hfc render timed out after 90.0s for node I1"

    spec = {
        "id": "dc_render_fail",
        "type": "design_consistency",
        "node_id": "I2",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="/tmp/before.hfc.json",
        after_path="/tmp/after.hfc.json",
        work_dir=tmp_path,
        task_instruction="Add a frame",
        skip_llm=False,
        model="test",
    )
    assert result.score == 0.0
    assert result.details["reason"] == "render_failed"


def test_design_consistency_missing_screenshot_node(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    spec = {
        "id": "dc1",
        "type": "design_consistency",
        "node_id": "MISSING",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="",
        after_path="",
        work_dir=tmp_path,
        task_instruction="Add a hello frame",
        skip_llm=True,
        model="test",
    )
    assert result.score == 0.0
    assert result.details["reason"] == "screenshot_node_missing_in_after"


def test_before_vs_after_missing_context_scores_zero(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    spec = {
        "id": "bva1",
        "type": "before_vs_after",
        "surrounding_context_node_id": "MISSING",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="",
        after_path="",
        work_dir=tmp_path,
        task_instruction="Task",
        skip_llm=True,
        model="test",
    )
    assert result.score == 0.0
    assert result.details["reason"] == "context_node_missing_in_after"


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_design_consistency_uses_context_node(mock_judge, mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    rendered: dict[str, str] = {}

    def fake_render(**kwargs):
        rendered["node_id"] = kwargs["node_id"]
        Path(kwargs["out"]).write_bytes(b"png")
        return None

    mock_render.side_effect = fake_render
    mock_judge.return_value = {
        "mean_score": 0.8,
        "consistency_scores": {"typography": 0.75},
        "fit_scores": {"layout_fit": 0.5},
    }

    spec = {
        "id": "dc1",
        "type": "design_consistency",
        "node_id": "I99",
        "surrounding_context_node_id": "I2",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="/tmp/before.hfc.json",
        after_path="/tmp/after.hfc.json",
        work_dir=tmp_path,
        task_instruction="Add a frame",
        skip_llm=False,
        model="test",
    )
    assert result.score == 0.8
    assert rendered["node_id"] == "I2"
    mock_judge.assert_called_once()


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_design_consistency_without_context_uses_subtree(
    mock_judge, mock_render, load_fixture, tmp_path
):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    rendered: dict[str, str] = {}

    def fake_render(**kwargs):
        rendered["node_id"] = kwargs["node_id"]
        Path(kwargs["out"]).write_bytes(b"png")
        return None

    mock_render.side_effect = fake_render
    mock_judge.return_value = {"mean_score": 0.7, "consistency_scores": {}, "fit_scores": {}}

    spec = {
        "id": "dc2",
        "type": "design_consistency",
        "node_id": "I2",
        "focus": "largest_added",
    }
    run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="/tmp/before.hfc.json",
        after_path="/tmp/after.hfc.json",
        work_dir=tmp_path,
        task_instruction="Add a frame",
        skip_llm=False,
        model="test",
    )
    assert rendered["node_id"] != "I2" or mock_render.called


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_task_completeness_skips_llm(mock_judge, mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")

    def fake_render(**kwargs):
        Path(kwargs["out"]).write_bytes(b"png")
        return None

    mock_render.side_effect = fake_render

    spec = {"id": "tc1", "type": "task_completeness"}
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="/tmp/before.hfc.json",
        after_path="/tmp/after.hfc.json",
        work_dir=tmp_path,
        task_instruction="Add a frame",
        skip_llm=True,
        model="test",
    )
    assert result.score == 0.75
    mock_judge.assert_not_called()


@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_diff_check_no_images(mock_judge, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    mock_judge.return_value = {"mean_score": 0.9, "score": 9.0}

    spec = {"id": "d1", "type": "diff"}
    run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="",
        after_path="",
        work_dir=tmp_path,
        task_instruction="Add a frame",
        skip_llm=False,
        model="test",
    )
    mock_judge.assert_called_once()
    assert mock_judge.call_args.kwargs.get("images") is None


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_compare_with_reference(mock_judge, mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    ref_path = tmp_path / "ref.png"
    ref_path.write_bytes(b"ref-png")
    rendered: dict[str, str] = {}

    def fake_render(**kwargs):
        rendered["node_id"] = kwargs["node_id"]
        Path(kwargs["out"]).write_bytes(b"agent-png")
        return None

    mock_render.side_effect = fake_render
    mock_judge.return_value = {"mean_score": 0.7, "preference_score": 7.0}

    spec = {
        "id": "cwr1",
        "type": "compare_with_reference",
        "reference_asset": "ref.png",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="/tmp/before.hfc.json",
        after_path="/tmp/after.hfc.json",
        work_dir=tmp_path,
        task_instruction="Add a Hello frame",
        assets_dir=str(tmp_path),
        skip_llm=False,
        model="test",
    )
    assert result.score == 0.7
    assert rendered["node_id"] == "I20"
    images = mock_judge.call_args.kwargs["images"]
    roles = {img["role"] for img in images}
    assert roles == {"reference", "agent"}


def test_compare_with_reference_missing_file_scores_zero(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    spec = {
        "id": "cwr2",
        "type": "compare_with_reference",
        "reference_asset": "missing.png",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path="",
        after_path="",
        work_dir=tmp_path,
        task_instruction="Task",
        assets_dir=str(tmp_path),
        skip_llm=True,
        model="test",
    )
    assert result.score == 0.0
    assert result.details["reason"] == "reference_file_missing"


def test_unknown_visual_type_raises(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    with pytest.raises(ValueError, match="Unknown visual check type"):
        run_visual_check(
            spec={"id": "x", "type": "legacy_mode"},
            before=before,
            after=after,
            graph=build_edit_graph(before, after),
            before_path="",
            after_path="",
            work_dir=tmp_path,
            task_instruction="",
            skip_llm=True,
            model="test",
        )
