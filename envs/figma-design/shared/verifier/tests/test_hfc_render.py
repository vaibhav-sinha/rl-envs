from unittest.mock import MagicMock, patch

import pytest

from figma_eval.hfc_render import render_node, render_node_or_error


@patch("figma_eval.hfc_render.subprocess.run")
def test_render_node_logs_stderr_on_failure(mock_run, capsys):
    mock_run.return_value = MagicMock(returncode=1, stdout="out line", stderr="err line")

    with pytest.raises(RuntimeError, match="exit 1"):
        render_node(file="/tmp/design.hfc.json", node_id="I1", out="/tmp/out.png")

    captured = capsys.readouterr().out
    assert "hfc render failed" in captured
    assert "stderr:" in captured
    assert "err line" in captured
    assert "stdout:" in captured
    assert "out line" in captured


@patch("figma_eval.hfc_render.subprocess.run")
def test_render_node_or_error_logs_and_returns_message(mock_run, capsys):
    mock_run.return_value = MagicMock(returncode=2, stdout="", stderr="broken render")

    err = render_node_or_error(file="/tmp/design.hfc.json", node_id="I2", out="/tmp/out.png")

    assert err is not None
    assert "exit 2" in err
    captured = capsys.readouterr().out
    assert "hfc render error node=I2" in captured
    assert "broken render" in captured
    assert "Traceback" in captured
