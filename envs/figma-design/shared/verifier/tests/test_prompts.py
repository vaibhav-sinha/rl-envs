from figma_eval.visual.prompts import (
    GOOD_DESIGN_CRITERIA,
    GOOD_DESIGN_DEFECT_CRITERIA,
    DEFAULT_TASK_COMPLETENESS_QUALITY_INSTRUCTIONS,
    build_design_consistency_prompt,
    build_good_design_prompt,
    build_task_completeness_prompt,
)


def test_good_design_prompt_includes_all_criteria():
    prompt = build_good_design_prompt(task_instruction="Add a footer.")
    assert "Add a footer." in prompt
    for key in GOOD_DESIGN_CRITERIA:
        assert key in prompt
    for key in GOOD_DESIGN_DEFECT_CRITERIA:
        assert f"### {key}" in prompt
    assert "Evaluate **defect dimensions first**" in prompt
    assert '"scores"' in prompt
    assert '"explanations"' in prompt


def test_task_completeness_prompt_includes_quality_gate():
    prompt = build_task_completeness_prompt(task_instruction="Add a login button.")
    assert DEFAULT_TASK_COMPLETENESS_QUALITY_INSTRUCTIONS.splitlines()[0] in prompt
    assert '"present"' in prompt
    assert '"quality_acceptable"' in prompt
    assert '"structurally_complete"' in prompt


def test_design_consistency_prompt_includes_explanations():
    prompt = build_design_consistency_prompt(
        task_instruction="Match the reference.",
        criteria=["Same background", "Keyboard at bottom"],
    )
    assert '"criteria_scores"' in prompt
    assert '"criteria_explanations"' in prompt
    assert "criterion_0" in prompt
    assert "criterion_1" in prompt


def test_task_completeness_prompt_without_evaluation_instructions():
    prompt = build_task_completeness_prompt(task_instruction="Add a login button.")
    assert "Add a login button." in prompt
    assert "## Visual quality gate (always apply)" in prompt
    assert "## Additional evaluation instructions" not in prompt


def test_task_completeness_prompt_with_evaluation_instructions():
    prompt = build_task_completeness_prompt(
        task_instruction="Add a login button.",
        evaluation_instructions="  Treat icon-only buttons as valid.  ",
    )
    assert "Add a login button." in prompt
    assert "## Additional evaluation instructions" in prompt
    assert "Treat icon-only buttons as valid." in prompt


def test_task_completeness_prompt_ignores_blank_evaluation_instructions():
    prompt = build_task_completeness_prompt(
        task_instruction="Add a login button.",
        evaluation_instructions="   ",
    )
    assert "## Additional evaluation instructions" not in prompt
