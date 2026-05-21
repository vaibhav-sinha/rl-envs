import json
from pathlib import Path
from unittest.mock import patch

import pytest

from figma_eval.edit_graph import build_edit_graph
from figma_eval.visual.run_visual import run_visual_check

_REPO_ROOT = Path(__file__).resolve().parents[5]
OKER_BEFORE = (
    _REPO_ROOT
    / "envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json"
)
OKER_AFTER_JOB = (
    _REPO_ROOT
    / "jobs/2026-05-22__00-48-07/oker-create-max-otp-screen__DR3WQEj/artifacts/design.hfc.json"
)


@patch("figma_eval.visual.run_visual.render_node_or_error")
def test_render_failure_scores_zero(mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    mock_render.return_value = "hfc render timed out after 90.0s for node I1"

    spec = {"id": "gd_render_fail", "type": "good_design"}
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


def test_good_design_no_changes_unresolved(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    spec = {"id": "gd1", "type": "good_design"}
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
    assert result.details["reason"] == "no_changes"


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_good_design_renders_largest_change(mock_judge, mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    rendered: dict[str, str] = {}

    def fake_render(**kwargs):
        rendered["node_id"] = kwargs["node_id"]
        Path(kwargs["out"]).write_bytes(b"png")
        return None

    mock_render.side_effect = fake_render
    mock_judge.return_value = {"mean_score": 0.8, "consistency_scores": {"typography": 0.75}}

    spec = {"id": "gd1", "type": "good_design"}
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
    assert rendered["node_id"] == "I20"
    mock_judge.assert_called_once()


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_good_design_uses_task_completeness_screenshot_with_allowed_root(
    mock_judge, mock_render, tmp_path
):
    if not OKER_BEFORE.is_file() or not OKER_AFTER_JOB.is_file():
        pytest.skip("oker job fixtures not present")
    before = json.loads(OKER_BEFORE.read_text(encoding="utf-8"))
    after = json.loads(OKER_AFTER_JOB.read_text(encoding="utf-8"))
    rendered: dict[str, str] = {}

    def fake_render(**kwargs):
        rendered["node_id"] = kwargs["node_id"]
        Path(kwargs["out"]).write_bytes(b"png")
        return None

    mock_render.side_effect = fake_render
    mock_judge.return_value = {"mean_score": 0.9, "consistency_scores": {"typography": 0.9}}

    spec = {"id": "gd1", "type": "good_design"}
    gates = {"allowed_change_inside_ids": ["1621:130309"]}
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        graph=build_edit_graph(before, after),
        before_path=str(OKER_BEFORE),
        after_path=str(OKER_AFTER_JOB),
        work_dir=tmp_path,
        task_instruction="Create max OTP screen",
        gates=gates,
        skip_llm=False,
        model="test",
    )
    assert result.score == 0.9
    assert rendered["node_id"] == "I78386"
    assert result.details["screenshot_node_id"] == "I78386"


def test_design_fit_missing_node_scores_zero(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    spec = {
        "id": "df1",
        "type": "design_fit",
        "node_id": "MISSING",
        "evaluation_prompt": "Check fit.",
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
    assert result.details["reason"] == "node_missing_in_after"


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_design_consistency_with_reference(mock_judge, mock_render, load_fixture, tmp_path):
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
    mock_judge.return_value = {
        "mean_score": 0.75,
        "consistency_scores": {"criterion_0": 0.75},
    }

    spec = {
        "id": "dc1",
        "type": "design_consistency",
        "reference_asset": "ref.png",
        "criteria": ["Same background pattern as reference"],
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
    assert result.score == 0.75
    assert rendered["node_id"] == "I20"
    images = mock_judge.call_args.kwargs["images"]
    roles = {img["role"] for img in images}
    assert roles == {"reference", "agent"}


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_task_completeness_skips_llm(mock_judge, mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    rendered: dict[str, str] = {}

    def fake_render(**kwargs):
        rendered["node_id"] = kwargs["node_id"]
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
    assert rendered["node_id"] == "I20"
    assert result.details["screenshot_node_id"] == "I20"
    mock_judge.assert_not_called()


@patch("figma_eval.visual.run_visual.render_node_or_error")
@patch("figma_eval.visual.run_visual.run_llm_judge")
def test_design_preference(mock_judge, mock_render, load_fixture, tmp_path):
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
        "id": "dp1",
        "type": "design_preference",
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


def test_design_preference_missing_file_scores_zero(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    spec = {
        "id": "dp2",
        "type": "design_preference",
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
            spec={"id": "x", "type": "before_vs_after"},
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
