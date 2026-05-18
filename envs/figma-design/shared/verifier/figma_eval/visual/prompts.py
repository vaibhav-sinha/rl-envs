from __future__ import annotations

from typing import Any

DEFAULT_CONSISTENCY_CRITERIA = [
    "typography",
    "spacing",
    "color",
    "content_not_overflowing",
    "alignment",
    "visual_hierarchy",
]

DEFAULT_FIT_CRITERIA = [
    "layout_fit",
    "scale_proportion",
    "style_cohesion_with_surroundings",
]


def _criteria_lines(criteria: list[str]) -> str:
    return "\n".join(f"- {name}" for name in criteria)


def build_design_consistency_prompt(
    *,
    task_instruction: str,
    consistency_criteria: list[str],
    fit_criteria: list[str] | None,
) -> str:
    fit_block = ""
    if fit_criteria:
        fit_block = (
            "\n\n## Design fit (with surrounding context)\n"
            "The screenshot includes surrounding UI context. Score how well the "
            "new design fits that context on:\n"
            f"{_criteria_lines(fit_criteria)}\n"
            'Include these under JSON key "fit_scores".'
        )

    return (
        "You are evaluating a Figma design produced by an agent.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Design consistency\n"
        "Score the new design on each criterion (1=poor, 5=excellent):\n"
        f"{_criteria_lines(consistency_criteria)}\n"
        f"{fit_block}\n\n"
        "Respond with JSON only:\n"
        "{\n"
        '  "consistency_scores": {"typography": 1-5, ...},\n'
        + ('  "fit_scores": {"layout_fit": 1-5, ...},\n' if fit_criteria else "")
        + "}\n"
        "Do not include markdown fences."
    )


def build_task_completeness_prompt(
    *,
    task_instruction: str,
    evaluation_instructions: str | None = None,
) -> str:
    extra = ""
    if evaluation_instructions and evaluation_instructions.strip():
        extra = (
            "\n\n## Additional evaluation instructions\n"
            f"{evaluation_instructions.strip()}\n"
        )

    return (
        "You are verifying whether an agent completed a Figma design task.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n"
        f"{extra}\n"
        "Review the screenshot of the design region that contains all changes.\n"
        "1. List each concrete requirement implied by the task.\n"
        "2. For each requirement, state whether it is satisfied.\n"
        "3. Set completed to true only if every requirement is satisfied.\n\n"
        "Respond with JSON only:\n"
        "{\n"
        '  "requirements": [{"description": "...", "satisfied": true|false}, ...],\n'
        '  "completed": true|false\n'
        "}\n"
        "Do not include markdown fences."
    )


def build_before_vs_after_prompt(*, task_instruction: str) -> str:
    return (
        "You are evaluating how well an agent completed a Figma design task.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "You are given BEFORE and AFTER screenshots of the same surrounding context region.\n"
        "Score how well the agent accomplished the task on a scale of 0-10 "
        "(0=not done or harmful, 10=fully accomplished with high quality).\n\n"
        "Respond with JSON only:\n"
        '{"score": 0-10}\n'
        "Do not include markdown fences."
    )


def build_compare_with_reference_prompt(*, task_instruction: str) -> str:
    return (
        "You are comparing an agent-produced Figma design to a reference design.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "You are given two images:\n"
        "- REFERENCE: the target design provided by the SME\n"
        "- AGENT: the design produced by the agent\n\n"
        "Score your preference on a scale of 0-10:\n"
        "- 0 = reference design is strongly preferred\n"
        "- 5 = both designs are equally preferred\n"
        "- 10 = agent design is strongly preferred\n\n"
        "Consider task completion, visual quality, and fidelity to the task requirements.\n\n"
        "Respond with JSON only:\n"
        '{"preference_score": 0-10}\n'
        "Do not include markdown fences."
    )


def build_diff_prompt(*, task_instruction: str, diff_summary: str) -> str:
    return (
        "You are evaluating whether an agent completed a Figma design task.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Design diff (no screenshots)\n"
        f"{diff_summary}\n\n"
        "Judge whether the diff shows the task was completed. "
        "Return a single score from 0-10 (0=not done, 10=fully done).\n\n"
        "Respond with JSON only:\n"
        '{"score": 0-10}\n'
        "Do not include markdown fences."
    )


def criteria_from_spec(spec: dict[str, Any], key: str, default: list[str]) -> list[str]:
    raw = spec.get(key)
    if not raw:
        return list(default)
    return [str(item) for item in raw]
