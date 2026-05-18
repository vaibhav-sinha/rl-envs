from pathlib import Path
from unittest.mock import patch

from figma_eval.visual.run_visual import run_visual_check


def test_stage1_region_missing(load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    spec = {
        "id": "v1",
        "region_id": "MISSING",
        "mode": "relative_to_siblings",
        "instruction": "test",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        before_path="",
        after_path="",
        work_dir=tmp_path,
        skip_llm=True,
        model="test",
    )
    assert result.score == 0.2
    assert result.details["stage1"] == "region_missing_in_after"


@patch("figma_eval.visual.run_visual.render_node")
@patch("figma_eval.visual.run_visual.run_visual_judge")
def test_visual_skips_llm(mock_judge, mock_render, load_fixture, tmp_path):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")

    call_count = {"n": 0}

    def fake_render(**kwargs):
        call_count["n"] += 1
        Path(kwargs["out"]).write_bytes(f"png-{call_count['n']}".encode())

    mock_render.side_effect = fake_render

    spec = {
        "id": "v1",
        "region_id": "I2",
        "mode": "relative_to_siblings",
        "instruction": "test",
    }
    result = run_visual_check(
        spec=spec,
        before=before,
        after=after,
        before_path="/tmp/before.hfc.json",
        after_path="/tmp/after.hfc.json",
        work_dir=tmp_path,
        skip_llm=True,
        model="test",
    )
    assert result.score == 0.75
    mock_judge.assert_not_called()
