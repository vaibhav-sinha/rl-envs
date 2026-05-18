from figma_eval.visual.prompts import build_task_completeness_prompt


def test_task_completeness_prompt_without_evaluation_instructions():
    prompt = build_task_completeness_prompt(task_instruction="Add a login button.")
    assert "Add a login button." in prompt
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
