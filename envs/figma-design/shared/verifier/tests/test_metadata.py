from unittest.mock import patch

from figma_eval.edit_graph import build_edit_graph
from figma_eval.metadata.run_metadata import run_metadata_check


def _before_after_with_new_paint_style() -> tuple[dict, dict]:
    base_style = {"id": "PS1", "name": "Base", "paints": [{"type": "SOLID"}]}
    doc = {
        "id": "I1",
        "type": "DOCUMENT",
        "name": "Document",
        "children": [
            {
                "id": "I2",
                "type": "PAGE",
                "name": "Page",
                "children": [
                    {
                        "id": "I3",
                        "type": "FRAME",
                        "name": "Frame",
                        "x": 0,
                        "y": 0,
                        "width": 100,
                        "height": 100,
                        "children": [],
                    }
                ],
            }
        ],
    }
    before = {"schemaVersion": 1, "document": doc, "paintStyles": [base_style]}
    after = {
        "schemaVersion": 1,
        "document": doc,
        "paintStyles": [
            base_style,
            {"id": "PS2", "name": "PDP/CTA/Yellow", "paints": [{"type": "SOLID"}]},
        ],
    }
    return before, after


@patch("figma_eval.metadata.run_metadata.run_llm_judge")
def test_diff_check_no_images(mock_judge, load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    mock_judge.return_value = {"mean_score": 0.9, "score": 9.0}

    spec = {"id": "d1", "type": "diff"}
    result = run_metadata_check(
        spec=spec,
        graph=build_edit_graph(before, after),
        before=before,
        after=after,
        task_instruction="Add a frame",
        skip_llm=False,
        model="test",
    )
    mock_judge.assert_called_once()
    assert mock_judge.call_args.kwargs.get("images") is None
    assert result.category == "metadata"
    assert result.id == "metadata.d1"
    assert result.score == 0.9


@patch("figma_eval.metadata.run_metadata.run_llm_judge")
def test_diff_check_prompt_includes_resource_summary(mock_judge):
    before, after = _before_after_with_new_paint_style()
    mock_judge.return_value = {"mean_score": 1.0, "score": 10.0}

    run_metadata_check(
        spec={"id": "d1", "type": "diff"},
        graph=build_edit_graph(before, after),
        before=before,
        after=after,
        task_instruction="Create fill styles",
        skip_llm=False,
        model="test",
    )
    prompt = mock_judge.call_args.kwargs["prompt"]
    assert "## Resources (styles & variables)" in prompt
    assert "paintStyles:" in prompt
    assert 'PDP/CTA/Yellow' in prompt
