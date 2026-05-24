from __future__ import annotations

# Defect dimensions are evaluated first and dominate the final score.
GOOD_DESIGN_DEFECT_CRITERIA = [
    "no_placeholders_or_broken_media",
    "layout_proportions",
    "layout_completeness",
]

GOOD_DESIGN_QUALITY_CRITERIA = [
    "typography",
    "spacing",
    "color",
    "content_not_overflowing",
    "alignment",
    "visual_hierarchy",
]

GOOD_DESIGN_CRITERIA = GOOD_DESIGN_DEFECT_CRITERIA + GOOD_DESIGN_QUALITY_CRITERIA

# Normalized score at or below this threshold (raw 1–5 score <= 2) triggers a hard cap.
GOOD_DESIGN_DEFECT_SEVERE_THRESHOLD = 0.25
GOOD_DESIGN_DEFECT_SEVERE_CAP = 0.4

DEFAULT_TASK_COMPLETENESS_QUALITY_INSTRUCTIONS = (
    "Separate structural presence from visual quality for every requirement.\n"
    "- present: the required element or behavior exists in the design.\n"
    "- quality_acceptable: the implementation is production-ready — no placeholder blocks, "
    "truncated or clipped text, broken layouts, extreme empty space, or obviously unfinished UI.\n"
    "A requirement counts as fully satisfied only when both present and quality_acceptable are true. "
    "Do not mark quality_acceptable true just because a colored rectangle, stub label, or broken "
    "layout implies the intent."
)

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


def composite_screenshot_note(*, composite: bool, frame_count: int) -> str:
    if not composite or frame_count < 2:
        return ""
    return (
        f"\nThe screenshot is a grid of {frame_count} frames ({frame_count} agent deliverables), "
        "arranged left-to-right, top-to-bottom, 3 frames per row.\n"
    )


def build_good_design_prompt(
    *,
    task_instruction: str,
    composite: bool = False,
    frame_count: int = 1,
) -> str:
    defect_score_lines = ",\n".join(
        f'    "{key}": 1-5' for key in GOOD_DESIGN_DEFECT_CRITERIA
    )
    quality_score_lines = ",\n".join(
        f'    "{key}": 1-5' for key in GOOD_DESIGN_QUALITY_CRITERIA
    )
    explanation_lines = ",\n".join(
        f'    "{key}": "..."' for key in GOOD_DESIGN_CRITERIA
    )

    return (
        "You are evaluating the visual design quality of a Figma design produced by an agent.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Screenshot\n"
        "You are given one screenshot of the region that contains the agent's largest design "
        "changes. There is no reference image — judge only whether the result follows sound "
        "design practice."
        f"{composite_screenshot_note(composite=composite, frame_count=frame_count)}\n\n"
        "## Evaluation order\n"
        "Evaluate **defect dimensions first**. Be strict: obvious visual defects should receive "
        "low scores even if the layout is partially usable. Do not treat "
        "missing imagery, or broken layouts as intentional styling unless clearly deliberate.\n\n"
        "## Defect dimensions (score 1=poor, 5=excellent)\n\n"
        "### no_placeholders_or_broken_media\n"
        "- No large solid-color rectangles used as product imagery or hero visuals.\n"
        "- Product photos, icons, and illustrations render correctly — not missing or broken.\n"
        "- Penalize obvious placeholders, render failures, or flat color blocks standing in for content.\n\n"
        "### layout_proportions\n"
        "- Related elements have balanced, readable sizes (e.g. thumbnails not dwarfed by empty or placeholder areas).\n"
        "- Image grids, cards, and badges use sensible aspect ratios and scale relative to each other.\n"
        "- Penalize extreme size mismatches that make content hard to see or understand.\n\n"
        "### layout_completeness\n"
        "- Cards and sections feel finished — no large dead whitespace zones inside components.\n"
        "- Content fills the intended container; nothing looks half-built or misaligned within its frame.\n"
        "- Penalize layouts that look empty, lopsided, or abandoned on one side.\n\n"
        "## Quality dimensions (score 1=poor, 5=excellent)\n\n"
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
        f"{defect_score_lines},\n"
        f"{quality_score_lines}\n"
        "  },\n"
        '  "explanations": {\n'
        f"{explanation_lines}\n"
        "  }\n"
        "}\n"
        "Do not include markdown fences."
    )


def build_design_consistency_prompt(
    *,
    task_instruction: str,
    criteria: list[str],
    composite: bool = False,
    frame_count: int = 1,
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
        "- AGENT: screenshot of the agent's largest design change region"
        f"{composite_screenshot_note(composite=composite, frame_count=frame_count)}\n\n"
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
    composite: bool = False,
    frame_count: int = 1,
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
        f"{task_instruction}\n\n"
        "## Visual quality gate (always apply)\n"
        f"{DEFAULT_TASK_COMPLETENESS_QUALITY_INSTRUCTIONS}\n"
        f"{extra}\n"
        "Review the screenshot of the design region that contains all changes."
        f"{composite_screenshot_note(composite=composite, frame_count=frame_count)}\n"
        "1. List each concrete requirement implied by the task.\n"
        "2. For each requirement, judge present and quality_acceptable separately.\n"
        "3. Set structurally_complete to true only if every requirement is present.\n"
        "4. Set quality_acceptable to true only if every present requirement also has "
        "quality_acceptable true.\n"
        "5. Set completed to true only if structurally_complete and quality_acceptable are both true.\n\n"
        "Respond with JSON only:\n"
        "{\n"
        '  "requirements": [\n'
        "    {\n"
        '      "description": "...",\n'
        '      "present": true|false,\n'
        '      "quality_acceptable": true|false,\n'
        '      "satisfied": true|false\n'
        "    }\n"
        "  ],\n"
        '  "structurally_complete": true|false,\n'
        '  "quality_acceptable": true|false,\n'
        '  "completed": true|false\n'
        "}\n"
        "Set satisfied on each requirement to true only when both present and quality_acceptable "
        "are true.\n"
        "Do not include markdown fences."
    )


def build_design_preference_prompt(
    *,
    task_instruction: str,
    composite: bool = False,
    frame_count: int = 1,
) -> str:
    return (
        "You are comparing an agent-produced Figma design to a reference design.\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "You are given two images:\n"
        "- REFERENCE: the completed target design provided by the SME\n"
        "- AGENT: screenshot of the agent's largest design change region"
        f"{composite_screenshot_note(composite=composite, frame_count=frame_count)}\n\n"
        "Score your preference on a scale of 0-10:\n"
        "- 0 = reference design is strongly preferred\n"
        "- 5 = both designs are equally preferred\n"
        "- 10 = agent design is strongly preferred\n\n"
        "Consider task completion, visual quality, and fidelity to the task requirements.\n\n"
        "Respond with JSON only:\n"
        '{"preference_score": 0-10}\n'
        "Do not include markdown fences."
    )
