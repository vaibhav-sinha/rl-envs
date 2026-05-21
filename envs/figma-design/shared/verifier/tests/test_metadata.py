from unittest.mock import patch

from figma_eval.edit_graph import build_edit_graph
from figma_eval.metadata.run_metadata import run_metadata_check


@patch("figma_eval.metadata.run_metadata.run_llm_judge")
def test_diff_check_no_images(mock_judge, load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    mock_judge.return_value = {"mean_score": 0.9, "score": 9.0}

    spec = {"id": "d1", "type": "diff"}
    result = run_metadata_check(
        spec=spec,
        graph=build_edit_graph(before, after),
        task_instruction="Add a frame",
        skip_llm=False,
        model="test",
    )
    mock_judge.assert_called_once()
    assert mock_judge.call_args.kwargs.get("images") is None
    assert result.category == "metadata"
    assert result.id == "metadata.d1"
    assert result.score == 0.9
