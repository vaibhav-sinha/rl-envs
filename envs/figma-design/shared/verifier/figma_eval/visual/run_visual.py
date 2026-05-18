from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from ..edit_graph import changed_node_ids, format_diff_summary, resolve_focus_node_id
from ..hfc_render import render_node
from ..judge import (
    parse_criteria_scores,
    parse_numeric_score,
    parse_preference_score,
    parse_task_completeness,
    run_llm_judge,
)
from ..tree import (
    node_exists,
    resolve_compare_with_reference_screenshot_node,
    resolve_minimal_enclosing_frame,
)
from ..types import EditGraph, Envelope, SubCheckResult
from .prompts import (
    DEFAULT_CONSISTENCY_CRITERIA,
    DEFAULT_FIT_CRITERIA,
    build_before_vs_after_prompt,
    build_compare_with_reference_prompt,
    build_design_consistency_prompt,
    build_diff_prompt,
    build_task_completeness_prompt,
    criteria_from_spec,
)

SKIP_LLM_SCORE = 0.75


def _resolve_reference_asset_path(spec: dict[str, Any], assets_dir: str | None) -> Path:
    ref = spec["reference_asset"]
    if ref.startswith("/"):
        return Path(ref)
    return Path(assets_dir or "/app/assets") / ref


def _visual_result(
    spec: dict[str, Any], score: float, details: dict[str, Any] | None = None
) -> SubCheckResult:
    return SubCheckResult(
        id=f"visual.{spec['id']}",
        category="visual",
        score=score,
        applicable=True,
        weight=1.0,
        details=details,
    )


def _resolve_screenshot_node_id(
    spec: dict[str, Any],
    *,
    before: Envelope,
    after: Envelope,
) -> str:
    context_id = spec.get("surrounding_context_node_id")
    if context_id:
        return context_id

    node_id = spec["node_id"]
    focus = spec.get("focus") or "largest_added"
    if focus == "all":
        return node_id
    return resolve_focus_node_id(before, after, node_id, focus)


def _run_design_consistency(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    after_path: str,
    work: Path,
    task_instruction: str,
    skip_llm: bool,
    model: str,
    hfc_cli: str | None,
) -> SubCheckResult:
    screenshot_id = _resolve_screenshot_node_id(spec, before=before, after=after)
    if not node_exists(after, screenshot_id):
        return _visual_result(
            spec,
            0.0,
            {"reason": "screenshot_node_missing_in_after", "node_id": screenshot_id},
        )

    shot_path = work / f"{spec['id']}-design.png"
    render_node(file=after_path, node_id=screenshot_id, out=shot_path, hfc_cli=hfc_cli)

    consistency_criteria = criteria_from_spec(
        spec, "consistency_criteria", DEFAULT_CONSISTENCY_CRITERIA
    )
    has_context = bool(spec.get("surrounding_context_node_id"))
    fit_criteria = (
        criteria_from_spec(spec, "fit_criteria", DEFAULT_FIT_CRITERIA) if has_context else None
    )

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {
                "check": "design_consistency",
                "screenshot_node_id": screenshot_id,
                "llm": "skipped",
            },
        )

    prompt = build_design_consistency_prompt(
        task_instruction=task_instruction,
        consistency_criteria=consistency_criteria,
        fit_criteria=fit_criteria,
    )
    llm = run_llm_judge(
        prompt=prompt,
        images=[{"role": "design", "path": str(shot_path)}],
        model=model,
        parse_fn=lambda text: parse_criteria_scores(
            text,
            consistency_keys=consistency_criteria,
            fit_keys=fit_criteria,
        ),
        retry_hint=(
            "Return ONLY valid JSON with consistency_scores"
            + (" and fit_scores" if fit_criteria else "")
            + ". No markdown."
        ),
    )
    return _visual_result(
        spec,
        llm["mean_score"],
        {
            "check": "design_consistency",
            "screenshot_node_id": screenshot_id,
            "consistency_scores": llm.get("consistency_scores"),
            "fit_scores": llm.get("fit_scores"),
        },
    )


def _run_task_completeness(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    after_path: str,
    graph: EditGraph,
    work: Path,
    task_instruction: str,
    skip_llm: bool,
    model: str,
    hfc_cli: str | None,
) -> SubCheckResult:
    changes = changed_node_ids(graph)
    if not changes:
        return _visual_result(spec, 0.0, {"reason": "no_changes"})

    frame_id = spec.get("node_id") or resolve_minimal_enclosing_frame(after, changes)
    if not frame_id or not node_exists(after, frame_id):
        return _visual_result(spec, 0.0, {"reason": "enclosing_frame_missing", "node_id": frame_id})

    shot_path = work / f"{spec['id']}-completeness.png"
    render_node(file=after_path, node_id=frame_id, out=shot_path, hfc_cli=hfc_cli)

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {"check": "task_completeness", "screenshot_node_id": frame_id, "llm": "skipped"},
        )

    raw_instructions = spec.get("evaluation_instructions")
    evaluation_instructions = (
        str(raw_instructions).strip() if raw_instructions is not None else None
    )
    prompt = build_task_completeness_prompt(
        task_instruction=task_instruction,
        evaluation_instructions=evaluation_instructions or None,
    )
    llm = run_llm_judge(
        prompt=prompt,
        images=[{"role": "after", "path": str(shot_path)}],
        model=model,
        parse_fn=parse_task_completeness,
        retry_hint='Return ONLY valid JSON with keys "requirements" and "completed". No markdown.',
    )
    return _visual_result(
        spec,
        llm["mean_score"],
        {
            "check": "task_completeness",
            "screenshot_node_id": frame_id,
            "completed": llm.get("completed"),
            "requirements": llm.get("requirements"),
        },
    )


def _run_before_vs_after(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    before_path: str,
    after_path: str,
    work: Path,
    task_instruction: str,
    skip_llm: bool,
    model: str,
    hfc_cli: str | None,
) -> SubCheckResult:
    context_id = spec["surrounding_context_node_id"]
    if not node_exists(after, context_id):
        return _visual_result(
            spec,
            0.0,
            {"reason": "context_node_missing_in_after", "node_id": context_id},
        )

    before_shot = work / f"{spec['id']}-before.png"
    after_shot = work / f"{spec['id']}-after.png"
    render_node(file=before_path, node_id=context_id, out=before_shot, hfc_cli=hfc_cli)
    render_node(file=after_path, node_id=context_id, out=after_shot, hfc_cli=hfc_cli)

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {"check": "before_vs_after", "context_node_id": context_id, "llm": "skipped"},
        )

    prompt = build_before_vs_after_prompt(task_instruction=task_instruction)
    llm = run_llm_judge(
        prompt=prompt,
        images=[
            {"role": "before", "path": str(before_shot)},
            {"role": "after", "path": str(after_shot)},
        ],
        model=model,
        parse_fn=lambda text: parse_numeric_score(text, scale=10),
        retry_hint='Return ONLY valid JSON: {"score": 0-10}. No markdown.',
    )
    return _visual_result(
        spec,
        llm["mean_score"],
        {"check": "before_vs_after", "context_node_id": context_id, "raw_score": llm.get("score")},
    )


def _run_compare_with_reference(
    *,
    spec: dict[str, Any],
    after: Envelope,
    after_path: str,
    graph: EditGraph,
    work: Path,
    task_instruction: str,
    assets_dir: str | None,
    skip_llm: bool,
    model: str,
    hfc_cli: str | None,
) -> SubCheckResult:
    ref_path = _resolve_reference_asset_path(spec, assets_dir)
    if not ref_path.is_file():
        return _visual_result(
            spec,
            0.0,
            {"reason": "reference_file_missing", "path": str(ref_path)},
        )

    changes = changed_node_ids(graph)
    screenshot_id = resolve_compare_with_reference_screenshot_node(
        after,
        changes,
        added_ids=graph.added_ids,
        modified_ids=graph.modified_ids,
    )
    if not screenshot_id or not node_exists(after, screenshot_id):
        return _visual_result(
            spec,
            0.0,
            {"reason": "screenshot_node_unresolved", "node_id": screenshot_id},
        )

    agent_shot = work / f"{spec['id']}-agent.png"
    render_node(file=after_path, node_id=screenshot_id, out=agent_shot, hfc_cli=hfc_cli)

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {
                "check": "compare_with_reference",
                "screenshot_node_id": screenshot_id,
                "reference_path": str(ref_path),
                "llm": "skipped",
            },
        )

    prompt = build_compare_with_reference_prompt(task_instruction=task_instruction)
    llm = run_llm_judge(
        prompt=prompt,
        images=[
            {"role": "reference", "path": str(ref_path)},
            {"role": "agent", "path": str(agent_shot)},
        ],
        model=model,
        parse_fn=parse_preference_score,
        retry_hint='Return ONLY valid JSON: {"preference_score": 0-10}. No markdown.',
    )
    return _visual_result(
        spec,
        llm["mean_score"],
        {
            "check": "compare_with_reference",
            "screenshot_node_id": screenshot_id,
            "reference_path": str(ref_path),
            "preference_score": llm.get("preference_score"),
        },
    )


def _run_diff_check(
    *,
    spec: dict[str, Any],
    graph: EditGraph,
    task_instruction: str,
    skip_llm: bool,
    model: str,
) -> SubCheckResult:
    if skip_llm:
        return _visual_result(spec, SKIP_LLM_SCORE, {"check": "diff", "llm": "skipped"})

    diff_summary = format_diff_summary(graph)
    prompt = build_diff_prompt(task_instruction=task_instruction, diff_summary=diff_summary)
    llm = run_llm_judge(
        prompt=prompt,
        images=None,
        model=model,
        parse_fn=lambda text: parse_numeric_score(text, scale=10),
        retry_hint='Return ONLY valid JSON: {"score": 0-10}. No markdown.',
    )
    return _visual_result(
        spec,
        llm["mean_score"],
        {"check": "diff", "raw_score": llm.get("score")},
    )


def run_visual_check(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    before_path: str,
    after_path: str,
    work_dir: str | Path,
    task_instruction: str,
    assets_dir: str | None = None,
    skip_llm: bool = False,
    model: str,
    hfc_cli: str | None = None,
) -> SubCheckResult:
    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)

    check_type = spec.get("type")
    if check_type == "design_consistency":
        return _run_design_consistency(
            spec=spec,
            before=before,
            after=after,
            after_path=after_path,
            work=work,
            task_instruction=task_instruction,
            skip_llm=skip_llm,
            model=model,
            hfc_cli=hfc_cli,
        )
    if check_type == "task_completeness":
        return _run_task_completeness(
            spec=spec,
            before=before,
            after=after,
            after_path=after_path,
            graph=graph,
            work=work,
            task_instruction=task_instruction,
            skip_llm=skip_llm,
            model=model,
            hfc_cli=hfc_cli,
        )
    if check_type == "before_vs_after":
        return _run_before_vs_after(
            spec=spec,
            before=before,
            after=after,
            before_path=before_path,
            after_path=after_path,
            work=work,
            task_instruction=task_instruction,
            skip_llm=skip_llm,
            model=model,
            hfc_cli=hfc_cli,
        )
    if check_type == "diff":
        return _run_diff_check(
            spec=spec,
            graph=graph,
            task_instruction=task_instruction,
            skip_llm=skip_llm,
            model=model,
        )
    if check_type == "compare_with_reference":
        return _run_compare_with_reference(
            spec=spec,
            after=after,
            after_path=after_path,
            graph=graph,
            work=work,
            task_instruction=task_instruction,
            assets_dir=assets_dir,
            skip_llm=skip_llm,
            model=model,
            hfc_cli=hfc_cli,
        )

    raise ValueError(f"Unknown visual check type: {check_type!r}")


def run_all_visual_checks(
    *,
    specs: list[dict[str, Any]] | None,
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    before_path: str,
    after_path: str,
    work_dir: str | Path,
    task_instruction: str,
    assets_dir: str | None = None,
    skip_llm: bool = False,
    model: str,
    parallel: int = 4,
    hfc_cli: str | None = None,
) -> list[SubCheckResult]:
    if not specs:
        return []

    results: list[SubCheckResult | None] = [None] * len(specs)

    def run_one(idx: int, spec: dict[str, Any]) -> tuple[int, SubCheckResult]:
        return idx, run_visual_check(
            spec=spec,
            before=before,
            after=after,
            graph=graph,
            before_path=before_path,
            after_path=after_path,
            work_dir=work_dir,
            task_instruction=task_instruction,
            assets_dir=assets_dir,
            skip_llm=skip_llm,
            model=model,
            hfc_cli=hfc_cli,
        )

    workers = min(parallel, len(specs))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(run_one, i, s) for i, s in enumerate(specs)]
        for fut in as_completed(futures):
            idx, res = fut.result()
            results[idx] = res

    return [r for r in results if r is not None]
