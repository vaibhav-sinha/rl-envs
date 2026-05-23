"""Score screenshot(s) with LLM visual checks without running the full verifier."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

from ..judge import (
    parse_criteria_scores,
    parse_good_design_scores,
    parse_preference_score,
    parse_task_completeness,
    run_llm_judge,
)
from .instruction import load_task_instruction
from .prompts import (
    build_design_consistency_prompt,
    build_design_preference_prompt,
    build_good_design_prompt,
    build_task_completeness_prompt,
    criterion_ids,
)


def load_visual_check_from_spec(spec_path: str | Path, check_id: str) -> dict[str, Any]:
    path = Path(spec_path)
    spec = json.loads(path.read_text(encoding="utf-8"))
    for check in spec.get("visual", []):
        if check.get("id") == check_id:
            return dict(check)
    known = [c.get("id") for c in spec.get("visual", [])]
    raise ValueError(f"Visual check {check_id!r} not found in {path}. Known: {known}")


def load_criteria_file(path: str | Path) -> list[str]:
    """Load criteria from a JSON array or a plain-text file (one criterion per line)."""
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"Criteria file is empty: {file_path}")
    if file_path.suffix.lower() == ".json":
        data = json.loads(text)
        if isinstance(data, list):
            return [str(item) for item in data]
        if isinstance(data, dict) and "criteria" in data:
            raw = data["criteria"]
            if isinstance(raw, list):
                return [str(item) for item in raw]
        raise ValueError(f"Expected JSON array or {{\"criteria\": [...]}} in {file_path}")
    return [line.strip() for line in text.splitlines() if line.strip()]


def resolve_reference_path(
    reference: str | Path | None,
    *,
    visual_check: dict[str, Any] | None = None,
    assets_dir: str | Path | None = None,
) -> Path | None:
    if reference is not None:
        ref_path = Path(reference)
        if ref_path.is_file():
            return ref_path
        raise FileNotFoundError(f"Reference image not found: {ref_path}")

    if visual_check and visual_check.get("reference_asset"):
        ref_name = str(visual_check["reference_asset"])
        if ref_name.startswith("/"):
            ref_path = Path(ref_name)
        else:
            base = Path(assets_dir) if assets_dir else Path(".")
            ref_path = base / ref_name
        if ref_path.is_file():
            return ref_path
        raise FileNotFoundError(f"Reference image not found: {ref_path}")
    return None


def build_custom_single_image_prompt(
    *,
    task_instruction: str,
    criteria: list[str],
    preamble: str | None = None,
) -> str:
    ids = criterion_ids(len(criteria))
    score_lines = ",\n".join(f'    "{cid}": 1-5' for cid in ids)
    explanation_lines = ",\n".join(f'    "{cid}": "..."' for cid in ids)
    numbered = "\n".join(f"- {cid}: {text}" for cid, text in zip(ids, criteria))
    intro = preamble or (
        "You are evaluating the visual quality of a Figma design screenshot produced by an agent."
    )
    return (
        f"{intro}\n\n"
        "## Agent task\n"
        f"{task_instruction}\n\n"
        "## Screenshot\n"
        "You are given one screenshot of the design to evaluate.\n\n"
        "## Criteria to score (1=poor, 5=excellent)\n"
        "Score each criterion independently. Be strict about obvious visual defects "
        "(broken placeholders, truncated text, extreme empty space, unusable proportions):\n"
        f"{numbered}\n\n"
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


def _run_parsed_judge(
    *,
    prompt: str,
    images: list[dict[str, str]],
    model: str,
    parse_fn: Callable[[str], dict[str, Any]],
    retry_hint: str,
) -> dict[str, Any]:
    return run_llm_judge(
        prompt=prompt,
        images=images,
        model=model,
        parse_fn=parse_fn,
        retry_hint=retry_hint,
    )


def score_image(
    *,
    image: str | Path,
    check_type: str,
    task_instruction: str,
    model: str,
    reference: str | Path | None = None,
    criteria: list[str] | None = None,
    visual_check: dict[str, Any] | None = None,
    assets_dir: str | Path | None = None,
    prompt_file: str | Path | None = None,
    evaluation_instructions: str | None = None,
    image_role: str = "agent",
) -> dict[str, Any]:
    """Run one visual LLM check against local screenshot file(s)."""
    image_path = Path(image)
    if not image_path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    effective_type = check_type
    if visual_check:
        effective_type = str(visual_check.get("type", check_type))

    if prompt_file is not None:
        prompt = Path(prompt_file).read_text(encoding="utf-8")
        keys = criteria or []
        if not keys:
            raise ValueError("--criteria or --criteria-file is required with --prompt-file")
        ids = criterion_ids(len(keys))
        llm = _run_parsed_judge(
            prompt=prompt,
            images=[{"role": image_role, "path": str(image_path)}],
            model=model,
            parse_fn=lambda text: parse_criteria_scores(
                text,
                consistency_keys=ids,
                scores_key="criteria_scores",
                explanations_key="criteria_explanations",
            ),
            retry_hint=(
                'Return ONLY valid JSON with keys "criteria_scores" and '
                '"criteria_explanations". No markdown.'
            ),
        )
        return {
            "check_type": "custom_prompt",
            "score": llm["mean_score"],
            "image": str(image_path),
            "prompt_file": str(prompt_file),
            "criteria": keys,
            "criteria_scores": llm.get("consistency_scores"),
            "criteria_explanations": llm.get("explanations"),
            "raw": llm,
        }

    if effective_type == "good_design":
        prompt = build_good_design_prompt(task_instruction=task_instruction)
        llm = _run_parsed_judge(
            prompt=prompt,
            images=[{"role": "design", "path": str(image_path)}],
            model=model,
            parse_fn=parse_good_design_scores,
            retry_hint='Return ONLY valid JSON with keys "scores" and "explanations". No markdown.',
        )
        return {
            "check_type": "good_design",
            "score": llm["mean_score"],
            "image": str(image_path),
            "scores": llm.get("consistency_scores"),
            "explanations": llm.get("explanations"),
            "defect_min": llm.get("defect_min"),
            "quality_mean": llm.get("quality_mean"),
            "overall_mean": llm.get("overall_mean"),
            "raw": llm,
        }

    if effective_type == "task_completeness":
        extra = None
        if visual_check and visual_check.get("evaluation_instructions"):
            extra = str(visual_check["evaluation_instructions"])
        elif evaluation_instructions:
            extra = evaluation_instructions
        prompt = build_task_completeness_prompt(
            task_instruction=task_instruction,
            evaluation_instructions=extra,
        )
        llm = _run_parsed_judge(
            prompt=prompt,
            images=[{"role": "after", "path": str(image_path)}],
            model=model,
            parse_fn=parse_task_completeness,
            retry_hint='Return ONLY valid JSON with keys "requirements" and "completed". No markdown.',
        )
        return {
            "check_type": "task_completeness",
            "score": llm["mean_score"],
            "image": str(image_path),
            "completed": llm.get("completed"),
            "structurally_complete": llm.get("structurally_complete"),
            "quality_acceptable": llm.get("quality_acceptable"),
            "requirements": llm.get("requirements"),
            "raw": llm,
        }

    if effective_type == "design_consistency":
        ref_path = resolve_reference_path(
            reference,
            visual_check=visual_check,
            assets_dir=assets_dir,
        )
        if ref_path is None:
            raise ValueError("design_consistency requires --reference or a visual check with reference_asset")
        check_criteria = criteria
        if not check_criteria and visual_check:
            check_criteria = [str(c) for c in visual_check.get("criteria", [])]
        if not check_criteria:
            raise ValueError("design_consistency requires --criteria or eval-spec criteria")
        ids = criterion_ids(len(check_criteria))
        prompt = build_design_consistency_prompt(
            task_instruction=task_instruction,
            criteria=check_criteria,
        )
        llm = _run_parsed_judge(
            prompt=prompt,
            images=[
                {"role": "reference", "path": str(ref_path)},
                {"role": "agent", "path": str(image_path)},
            ],
            model=model,
            parse_fn=lambda text: parse_criteria_scores(
                text,
                consistency_keys=ids,
                scores_key="criteria_scores",
                explanations_key="criteria_explanations",
            ),
            retry_hint=(
                'Return ONLY valid JSON with keys "criteria_scores" and '
                '"criteria_explanations". No markdown.'
            ),
        )
        return {
            "check_type": "design_consistency",
            "score": llm["mean_score"],
            "image": str(image_path),
            "reference": str(ref_path),
            "criteria": check_criteria,
            "criteria_scores": llm.get("consistency_scores"),
            "criteria_explanations": llm.get("explanations"),
            "raw": llm,
        }

    if effective_type == "design_preference":
        ref_path = resolve_reference_path(
            reference,
            visual_check=visual_check,
            assets_dir=assets_dir,
        )
        if ref_path is None:
            raise ValueError("design_preference requires --reference or reference_asset")
        prompt = build_design_preference_prompt(task_instruction=task_instruction)
        llm = _run_parsed_judge(
            prompt=prompt,
            images=[
                {"role": "reference", "path": str(ref_path)},
                {"role": "agent", "path": str(image_path)},
            ],
            model=model,
            parse_fn=parse_preference_score,
            retry_hint='Return ONLY valid JSON: {"preference_score": 0-10}. No markdown.',
        )
        return {
            "check_type": "design_preference",
            "score": llm["mean_score"],
            "image": str(image_path),
            "reference": str(ref_path),
            "preference_score": llm.get("preference_score"),
            "raw": llm,
        }

    if effective_type == "custom_criteria":
        check_criteria = criteria or []
        if not check_criteria:
            raise ValueError("custom_criteria requires --criteria or --criteria-file")
        prompt = build_custom_single_image_prompt(
            task_instruction=task_instruction,
            criteria=check_criteria,
        )
        ids = criterion_ids(len(check_criteria))
        llm = _run_parsed_judge(
            prompt=prompt,
            images=[{"role": image_role, "path": str(image_path)}],
            model=model,
            parse_fn=lambda text: parse_criteria_scores(
                text,
                consistency_keys=ids,
                scores_key="criteria_scores",
                explanations_key="criteria_explanations",
            ),
            retry_hint=(
                'Return ONLY valid JSON with keys "criteria_scores" and '
                '"criteria_explanations". No markdown.'
            ),
        )
        return {
            "check_type": "custom_criteria",
            "score": llm["mean_score"],
            "image": str(image_path),
            "criteria": check_criteria,
            "criteria_scores": llm.get("consistency_scores"),
            "criteria_explanations": llm.get("explanations"),
            "raw": llm,
        }

    raise ValueError(
        f"Unknown check_type {effective_type!r}. "
        "Use good_design, task_completeness, design_consistency, design_preference, "
        "or custom_criteria."
    )
