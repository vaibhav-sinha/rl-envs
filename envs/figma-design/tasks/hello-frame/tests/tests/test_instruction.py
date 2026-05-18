from pathlib import Path

import pytest

from figma_eval.visual.instruction import load_task_instruction


def test_load_task_instruction_reads_explicit_path(tmp_path):
    path = tmp_path / "instruction.md"
    path.write_text("Do the thing", encoding="utf-8")
    assert load_task_instruction(path) == "Do the thing"


def test_load_task_instruction_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError, match="Instruction file not found"):
        load_task_instruction(tmp_path / "missing.md")
