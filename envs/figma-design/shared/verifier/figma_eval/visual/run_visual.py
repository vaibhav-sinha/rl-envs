from __future__ import annotations

from pathlib import Path
from typing import Any

from ..edit_graph import changed_node_ids
from ..hfc_render import render_node_or_error
from ..judge import (
    parse_criteria_scores,
    parse_good_design_scores,
    parse_numeric_score,
    parse_preference_score,
    parse_task_completeness,
    run_llm_judge,
)
from ..log import log
from ..tree import (
    node_exists,
    resolve_largest_change_region_node,
    resolve_task_completeness_screenshot_node,
)
from ..types import EditGraph, Envelope, SubCheckResult, visual_subcheck_weight_from_spec
from .prompts import (
    build_design_consistency_prompt,
    build_design_fit_prompt,
    build_design_preference_prompt,
    build_good_design_prompt,
    build_task_completeness_prompt,
    criterion_ids,
)

SKIP_LLM_SCORE = 0.75


def _render_screenshot(
    spec: dict[str, Any],
    *,
    file: str,
    node_id: str,
    out: Path,
    hfc_cli: str | None,
) -> SubCheckResult | None:
    err = render_node_or_error(file=file, node_id=node_id, out=out, hfc_cli=hfc_cli)
    if err is None:
        return None
    log(
        f"visual check {spec.get('id', '?')}: screenshot render failed "
        f"node={node_id} out={out}"
    )
    return _visual_result(
        spec,
        0.0,
        {"reason": "render_failed", "node_id": node_id, "error": err},
    )


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
        weight=visual_subcheck_weight_from_spec(spec),
        details=details,
    )


def _resolve_largest_change_screenshot_id(
    after: Envelope,
    graph: EditGraph,
) -> str | None:
    return resolve_largest_change_region_node(after, graph)


def _resolve_visual_screenshot_node(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    graph: EditGraph,
    gates: dict[str, Any] | None,
) -> str | None:
    """Screenshot target shared by good_design, task_completeness, and design_consistency."""
    explicit = spec.get("node_id")
    if explicit:
        return explicit
    allowed_roots = (gates or {}).get("allowed_change_inside_ids")
    return resolve_task_completeness_screenshot_node(
        after,
        before,
        graph,
        allowed_root_ids=allowed_roots,
    )


def _run_good_design(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    after_path: str,
    graph: EditGraph,
    gates: dict[str, Any] | None,
    work: Path,
    task_instruction: str,
    skip_llm: bool,
    model: str,
    hfc_cli: str | None,
) -> SubCheckResult:
    if not changed_node_ids(graph):
        return _visual_result(spec, 0.0, {"reason": "no_changes"})

    screenshot_id = _resolve_visual_screenshot_node(
        spec=spec,
        before=before,
        after=after,
        graph=graph,
        gates=gates,
    )
    if not screenshot_id or not node_exists(after, screenshot_id):
        return _visual_result(
            spec,
            0.0,
            {"reason": "enclosing_frame_missing", "node_id": screenshot_id},
        )

    shot_path = work / f"{spec['id']}-good-design.png"
    render_failed = _render_screenshot(
        spec,
        file=after_path,
        node_id=screenshot_id,
        out=shot_path,
        hfc_cli=hfc_cli,
    )
    if render_failed is not None:
        return render_failed

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {
                "check": "good_design",
                "screenshot_node_id": screenshot_id,
                "llm": "skipped",
            },
        )

    prompt = build_good_design_prompt(task_instruction=task_instruction)
    llm = run_llm_judge(
        prompt=prompt,
        images=[{"role": "design", "path": str(shot_path)}],
        model=model,
        parse_fn=parse_good_design_scores,
        retry_hint=(
            'Return ONLY valid JSON with keys "scores" and "explanations". No markdown.'
        ),
    )
    return _visual_result(
        spec,
        llm["mean_score"],
        {
            "check": "good_design",
            "screenshot_node_id": screenshot_id,
            "scores": llm.get("consistency_scores"),
            "explanations": llm.get("explanations"),
            "defect_min": llm.get("defect_min"),
            "quality_mean": llm.get("quality_mean"),
            "overall_mean": llm.get("overall_mean"),
        },
    )


def _run_design_consistency(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    after_path: str,
    graph: EditGraph,
    gates: dict[str, Any] | None,
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

    criteria = [str(c) for c in spec["criteria"]]
    ids = criterion_ids(len(criteria))

    screenshot_id = _resolve_visual_screenshot_node(
        spec=spec,
        before=before,
        after=after,
        graph=graph,
        gates=gates,
    )
    if not screenshot_id or not node_exists(after, screenshot_id):
        return _visual_result(
            spec,
            0.0,
            {"reason": "enclosing_frame_missing", "node_id": screenshot_id},
        )

    agent_shot = work / f"{spec['id']}-agent.png"
    render_failed = _render_screenshot(
        spec,
        file=after_path,
        node_id=screenshot_id,
        out=agent_shot,
        hfc_cli=hfc_cli,
    )
    if render_failed is not None:
        return render_failed

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {
                "check": "design_consistency",
                "screenshot_node_id": screenshot_id,
                "reference_path": str(ref_path),
                "llm": "skipped",
            },
        )

    prompt = build_design_consistency_prompt(
        task_instruction=task_instruction,
        criteria=criteria,
    )
    llm = run_llm_judge(
        prompt=prompt,
        images=[
            {"role": "reference", "path": str(ref_path)},
            {"role": "agent", "path": str(agent_shot)},
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
    return _visual_result(
        spec,
        llm["mean_score"],
        {
            "check": "design_consistency",
            "screenshot_node_id": screenshot_id,
            "reference_path": str(ref_path),
            "criteria_scores": llm.get("consistency_scores"),
            "criteria_explanations": llm.get("explanations"),
        },
    )


def _run_design_fit(
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
    node_id = spec["node_id"]
    if not node_exists(after, node_id):
        return _visual_result(
            spec,
            0.0,
            {"reason": "node_missing_in_after", "node_id": node_id},
        )

    before_shot = work / f"{spec['id']}-before.png"
    after_shot = work / f"{spec['id']}-after.png"
    render_failed = _render_screenshot(
        spec,
        file=before_path,
        node_id=node_id,
        out=before_shot,
        hfc_cli=hfc_cli,
    )
    if render_failed is not None:
        return render_failed
    render_failed = _render_screenshot(
        spec,
        file=after_path,
        node_id=node_id,
        out=after_shot,
        hfc_cli=hfc_cli,
    )
    if render_failed is not None:
        return render_failed

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {"check": "design_fit", "node_id": node_id, "llm": "skipped"},
        )

    prompt = build_design_fit_prompt(
        task_instruction=task_instruction,
        evaluation_prompt=str(spec["evaluation_prompt"]),
    )
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
        {"check": "design_fit", "node_id": node_id, "raw_score": llm.get("score")},
    )


def _run_task_completeness(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    after_path: str,
    graph: EditGraph,
    gates: dict[str, Any] | None,
    work: Path,
    task_instruction: str,
    skip_llm: bool,
    model: str,
    hfc_cli: str | None,
) -> SubCheckResult:
    if not changed_node_ids(graph):
        return _visual_result(spec, 0.0, {"reason": "no_changes"})

    frame_id = _resolve_visual_screenshot_node(
        spec=spec,
        before=before,
        after=after,
        graph=graph,
        gates=gates,
    )
    if not frame_id or not node_exists(after, frame_id):
        return _visual_result(spec, 0.0, {"reason": "enclosing_frame_missing", "node_id": frame_id})

    shot_path = work / f"{spec['id']}-completeness.png"
    render_failed = _render_screenshot(
        spec,
        file=after_path,
        node_id=frame_id,
        out=shot_path,
        hfc_cli=hfc_cli,
    )
    if render_failed is not None:
        return render_failed

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
        retry_hint=(
            'Return ONLY valid JSON with keys "requirements", "structurally_complete", '
            '"quality_acceptable", and "completed". No markdown.'
        ),
    )
    return _visual_result(
        spec,
        llm["mean_score"],
        {
            "check": "task_completeness",
            "screenshot_node_id": frame_id,
            "completed": llm.get("completed"),
            "structurally_complete": llm.get("structurally_complete"),
            "quality_acceptable": llm.get("quality_acceptable"),
            "requirements": llm.get("requirements"),
        },
    )


def _run_design_preference(
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

    screenshot_id = _resolve_largest_change_screenshot_id(after, graph)
    if not screenshot_id or not node_exists(after, screenshot_id):
        return _visual_result(
            spec,
            0.0,
            {"reason": "screenshot_node_unresolved", "node_id": screenshot_id},
        )

    agent_shot = work / f"{spec['id']}-agent.png"
    render_failed = _render_screenshot(
        spec,
        file=after_path,
        node_id=screenshot_id,
        out=agent_shot,
        hfc_cli=hfc_cli,
    )
    if render_failed is not None:
        return render_failed

    if skip_llm:
        return _visual_result(
            spec,
            SKIP_LLM_SCORE,
            {
                "check": "design_preference",
                "screenshot_node_id": screenshot_id,
                "reference_path": str(ref_path),
                "llm": "skipped",
            },
        )

    prompt = build_design_preference_prompt(task_instruction=task_instruction)
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
            "check": "design_preference",
            "screenshot_node_id": screenshot_id,
            "reference_path": str(ref_path),
            "preference_score": llm.get("preference_score"),
        },
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
    gates: dict[str, Any] | None = None,
    assets_dir: str | None = None,
    skip_llm: bool = False,
    model: str,
    hfc_cli: str | None = None,
) -> SubCheckResult:
    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)

    check_type = spec.get("type")
    check_id = spec.get("id", "?")
    log(f"visual check start id={check_id} type={check_type}")

    if check_type == "good_design":
        return _log_visual_done(
            spec,
            _run_good_design(
                spec=spec,
                before=before,
                after=after,
                after_path=after_path,
                graph=graph,
                gates=gates,
                work=work,
                task_instruction=task_instruction,
                skip_llm=skip_llm,
                model=model,
                hfc_cli=hfc_cli,
            ),
        )
    if check_type == "design_consistency":
        return _log_visual_done(
            spec,
            _run_design_consistency(
                spec=spec,
                before=before,
                after=after,
                after_path=after_path,
                graph=graph,
                gates=gates,
                work=work,
                task_instruction=task_instruction,
                assets_dir=assets_dir,
                skip_llm=skip_llm,
                model=model,
                hfc_cli=hfc_cli,
            ),
        )
    if check_type == "design_fit":
        return _log_visual_done(
            spec,
            _run_design_fit(
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
            ),
        )
    if check_type == "task_completeness":
        return _log_visual_done(
            spec,
            _run_task_completeness(
                spec=spec,
                before=before,
                after=after,
                after_path=after_path,
                graph=graph,
                gates=gates,
                work=work,
                task_instruction=task_instruction,
                skip_llm=skip_llm,
                model=model,
                hfc_cli=hfc_cli,
            ),
        )
    if check_type == "design_preference":
        return _log_visual_done(
            spec,
            _run_design_preference(
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
            ),
        )

    raise ValueError(f"Unknown visual check type: {check_type!r}")


def _log_visual_done(spec: dict[str, Any], result: SubCheckResult) -> SubCheckResult:
    log(
        f"visual check done id={spec.get('id', '?')} type={spec.get('type')} "
        f"score={result.score}"
    )
    return result


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
    gates: dict[str, Any] | None = None,
    assets_dir: str | None = None,
    skip_llm: bool = False,
    model: str,
    parallel: int = 1,
    hfc_cli: str | None = None,
) -> list[SubCheckResult]:
    if not specs:
        return []

    if parallel != 1:
        log(f"visual batch: ignoring parallel={parallel}; running sequentially")
    log(f"visual batch start count={len(specs)}")
    results: list[SubCheckResult] = []
    for spec in specs:
        results.append(
            run_visual_check(
                spec=spec,
                before=before,
                after=after,
                graph=graph,
                before_path=before_path,
                after_path=after_path,
                work_dir=work_dir,
                task_instruction=task_instruction,
                gates=gates,
                assets_dir=assets_dir,
                skip_llm=skip_llm,
                model=model,
                hfc_cli=hfc_cli,
            )
        )

    log(f"visual batch done count={len(results)}")
    return results
