from __future__ import annotations

from pathlib import Path
from typing import Any

from ..edit_graph import EditGraph, format_diff_summary
from ..judge import parse_numeric_score, run_llm_judge
from ..log import log
from ..types import SubCheckResult, subcheck_weight_from_spec
from .prompts import build_diff_prompt

SKIP_LLM_SCORE = 0.75


def _metadata_result(
    spec: dict[str, Any], score: float, details: dict[str, Any] | None = None
) -> SubCheckResult:
    return SubCheckResult(
        id=f"metadata.{spec['id']}",
        category="metadata",
        score=score,
        applicable=True,
        weight=subcheck_weight_from_spec(spec),
        details=details,
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
        return _metadata_result(spec, SKIP_LLM_SCORE, {"check": "diff", "llm": "skipped"})

    diff_summary = format_diff_summary(graph)
    prompt = build_diff_prompt(task_instruction=task_instruction, diff_summary=diff_summary)
    llm = run_llm_judge(
        prompt=prompt,
        images=None,
        model=model,
        parse_fn=lambda text: parse_numeric_score(text, scale=10),
        retry_hint='Return ONLY valid JSON: {"score": 0-10}. No markdown.',
    )
    return _metadata_result(
        spec,
        llm["mean_score"],
        {"check": "diff", "raw_score": llm.get("score")},
    )


def run_metadata_check(
    *,
    spec: dict[str, Any],
    graph: EditGraph,
    task_instruction: str,
    skip_llm: bool = False,
    model: str,
) -> SubCheckResult:
    check_type = spec.get("type")
    check_id = spec.get("id", "?")
    log(f"metadata check start id={check_id} type={check_type}")

    if check_type == "diff":
        result = _run_diff_check(
            spec=spec,
            graph=graph,
            task_instruction=task_instruction,
            skip_llm=skip_llm,
            model=model,
        )
    else:
        raise ValueError(f"Unknown metadata check type: {check_type!r}")

    log(f"metadata check done id={check_id} type={check_type} score={result.score}")
    return result


def run_all_metadata_checks(
    *,
    specs: list[dict[str, Any]] | None,
    graph: EditGraph,
    task_instruction: str,
    skip_llm: bool = False,
    model: str,
) -> list[SubCheckResult]:
    if not specs:
        return []

    log(f"metadata batch start count={len(specs)}")
    results: list[SubCheckResult] = []
    for spec in specs:
        results.append(
            run_metadata_check(
                spec=spec,
                graph=graph,
                task_instruction=task_instruction,
                skip_llm=skip_llm,
                model=model,
            )
        )
    log(f"metadata batch done count={len(results)}")
    return results
