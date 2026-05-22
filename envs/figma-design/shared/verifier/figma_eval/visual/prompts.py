from __future__ import annotations

GOOD_DESIGN_CRITERIA = [
    "typography",
    "spacing",
    "color",
    "content_not_overflowing",
    "alignment",
    "visual_hierarchy",
]

DEFAULT_DESIGN_FIT_PROMPT = (
    "Evaluate how well the agent's changes fit within the original surrounding design. "
    "Consider layout integration, scale, style cohesion, and whether new elements feel "
    "native to the parent frame."
)


def criterion_ids(count: int) -> list[str]:
    return [f"criterion_{i}" for i in range(count)]


def _criteria_lines(criteria: list[str]) -> str:
    return "\n".join(f"- {name}" for name in criteria)


def _numbered_criteria_lines(criteria: list[str]) -> str:
    lines: list[str] = []
    for i, text in enumerate(criteria):
        lines.append(f"- criterion_{i}: {text}")
    return "\n".join(lines)


def build_good_design_prompt(*, task_instruction: str) -> str:
    return (
        "You are evaluating the visual design quality of a Figma design produced by an agent.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Screenshot\n"
        "You are given one screenshot of the region that contains the agent's largest design "
        "changes. There is no reference image — judge only whether the result follows sound "
        "design practice.\n\n"
        "## How to evaluate each dimension (score 1=poor, 5=excellent)\n\n"
        "### typography\n"
        "- Clear type hierarchy: headings, body, labels, and captions are visually distinct.\n"
        "- Font sizes are appropriate for role (not too small to read, not oversized without reason).\n"
        "- Font weights emphasize importance correctly (e.g. titles bolder than body).\n"
        "- Text color has sufficient contrast against its background.\n"
        "- No obvious orphaned or conflicting text styles in the same role.\n\n"
        "### spacing\n"
        "- Padding and gaps feel consistent within and between related groups.\n"
        "- Elements align to a coherent grid or rhythm; nothing looks randomly placed.\n"
        "- No cramped clusters or excessive empty voids unless intentional.\n"
        "- Related items are grouped; unrelated items have clear separation.\n\n"
        "### color\n"
        "- Palette is purposeful: primary, secondary, neutral, and accent roles are clear.\n"
        "- Contrast supports readability and affordance (buttons, links, states).\n"
        "- Semantic colors (error, success, warning) are used appropriately when present.\n"
        "- Avoid muddy, low-contrast grays that reduce clarity.\n\n"
        "### content_not_overflowing\n"
        "- No clipped or truncated text, icons, or images unless clearly intentional.\n"
        "- Buttons and chips show full labels; avatars and thumbnails are not cut off.\n"
        "- Scroll areas or ellipsis are only used where overflow is expected.\n\n"
        "### alignment\n"
        "- Edges and baselines line up across rows, columns, and form fields.\n"
        "- Icons and text in rows are vertically centered or optically aligned.\n"
        "- No elements that look one or two pixels off compared to neighbors.\n\n"
        "### visual_hierarchy\n"
        "- A clear focal point guides the eye to the primary action or message.\n"
        "- Secondary information is visually subordinate to primary content.\n"
        "- Grouping and whitespace reinforce what belongs together.\n\n"
        "For each dimension, provide a brief explanation (1-2 sentences) justifying the score.\n\n"
        "Respond with JSON only:\n"
        "{\n"
        '  "scores": {\n'
        '    "typography": 1-5,\n'
        '    "spacing": 1-5,\n'
        '    "color": 1-5,\n'
        '    "content_not_overflowing": 1-5,\n'
        '    "alignment": 1-5,\n'
        '    "visual_hierarchy": 1-5\n'
        "  },\n"
        '  "explanations": {\n'
        '    "typography": "...",\n'
        '    "spacing": "...",\n'
        '    "color": "...",\n'
        '    "content_not_overflowing": "...",\n'
        '    "alignment": "...",\n'
        '    "visual_hierarchy": "..."\n'
        "  }\n"
        "}\n"
        "Do not include markdown fences."
    )


def build_design_consistency_prompt(
    *,
    task_instruction: str,
    criteria: list[str],
) -> str:
    ids = criterion_ids(len(criteria))
    score_lines = ",\n".join(f'    "{cid}": 1-5' for cid in ids)
    explanation_lines = ",\n".join(f'    "{cid}": "..."' for cid in ids)

    return (
        "You are comparing an agent-produced Figma design to a reference design.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Images\n"
        "- REFERENCE: the target design provided by the subject-matter expert\n"
        "- AGENT: screenshot of the agent's largest design change region\n\n"
        "## Criteria to score (1=poor, 5=excellent)\n"
        "Score each criterion independently based on how well the AGENT image matches "
        "the REFERENCE with respect to that criterion only:\n"
        f"{_numbered_criteria_lines(criteria)}\n\n"
        "For each criterion, provide a brief explanation (1-2 sentences) justifying the score.\n\n"
        "Respond with JSON only:\n"
        "{\n"
        '  "criteria_scores": {\n'
        f"{score_lines}\n"
        "  },\n"
        '  "criteria_explanations": {\n'
        f"{explanation_lines}\n"
        "  }\n"
        "}\n"
        "Do not include markdown fences."
    )


def build_design_fit_prompt(
    *,
    task_instruction: str,
    evaluation_prompt: str,
) -> str:
    return (
        "You are evaluating how well an agent's Figma design changes fit their context.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Evaluation focus\n"
        f"{evaluation_prompt}\n\n"
        "## Images\n"
        "You are given BEFORE and AFTER screenshots of the same node region.\n"
        "BEFORE shows the baseline; AFTER shows the agent's result.\n\n"
        "Score how well the agent accomplished the evaluation focus on a scale of 0-10 "
        "(0=not done or harmful, 10=fully accomplished with high quality).\n\n"
        "Respond with JSON only:\n"
        '{"score": 0-10}\n'
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


def build_design_preference_prompt(*, task_instruction: str) -> str:
    return (
        "You are comparing an agent-produced Figma design to a reference design.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "You are given two images:\n"
        "- REFERENCE: the completed target design provided by the SME\n"
        "- AGENT: screenshot of the agent's largest design change region\n\n"
        "Score your preference on a scale of 0-10:\n"
        "- 0 = reference design is strongly preferred\n"
        "- 5 = both designs are equally preferred\n"
        "- 10 = agent design is strongly preferred\n\n"
        "Consider task completion, visual quality, and fidelity to the task requirements.\n\n"
        "Respond with JSON only:\n"
        '{"preference_score": 0-10}\n'
        "Do not include markdown fences."
    )
