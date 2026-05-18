from __future__ import annotations

import json
import os
from dataclasses import asdict
from pathlib import Path
from typing import Any

from .aggregator import aggregate_scores, compute_completion_gate
from .log import log
from .report import build_eval_details, log_subcheck_results
from .catalog import build_catalog
from .checks import run_all_checks
from .design_system import run_design_system_checks
from .edit_graph import build_edit_graph
from .gates import run_gates
from .heuristics import run_heuristics
from .schema import load_and_validate_eval_spec
from .envelope_normalize import normalize_component_envelope
from .types import EvalReport, Envelope, SubCheckResult
from .visual import run_all_visual_checks
from .visual.instruction import load_task_instruction


def load_envelope(path: str | Path) -> Envelope:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not data.get("document"):
        raise ValueError(f"Invalid envelope at {path}: missing document")
    return normalize_component_envelope(data)


def _subcheck_to_dict(s: SubCheckResult) -> dict[str, Any]:
    d = asdict(s)
    return d


def run_eval(
    *,
    before_path: str | Path,
    after_path: str | Path,
    spec_path: str | Path,
    instruction_path: str | Path,
    report_path: str | Path,
    assets_dir: str | None = None,
    parallel: int = 1,
    skip_llm: bool = False,
    work_dir: str | Path | None = None,
    hfc_cli: str | None = None,
) -> dict[str, Any]:
    log("run_eval start")
    spec = load_and_validate_eval_spec(spec_path)
    log("eval spec loaded")
    before = load_envelope(before_path)
    after = load_envelope(after_path)
    graph = build_edit_graph(before, after)
    catalog = build_catalog(before)
    log(
        f"edit graph: equal={graph.equal} added={len(graph.added_ids)} "
        f"deleted={len(graph.deleted_ids)} modified={len(graph.modified_ids)}"
    )

    if work_dir is None:
        work_dir = os.environ.get("EVAL_WORK_DIR", "/logs/verifier/screenshots")
    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)

    model = os.environ.get("EVAL_JUDGE_MODEL", "gemini/gemini-3-flash-preview")
    log(f"judge model={model} skip_llm={skip_llm} parallel={parallel}")

    log("running gates")
    gate_results = run_gates(before, after, graph, spec.get("gates"))
    log(f"gates done ({len(gate_results)} results)")
    log_subcheck_results(gate_results)
    log("running structural checks")
    check_results = run_all_checks(spec.get("checks"), before, after, graph, catalog)
    log(f"checks done ({len(check_results)} results)")
    log_subcheck_results(check_results)
    log("running design-system checks")
    design_results = run_design_system_checks(
        before, after, graph, catalog, spec.get("design_system")
    )
    log(f"design-system done ({len(design_results)} results)")
    log_subcheck_results(design_results)
    log("running heuristics")
    heuristic_results = run_heuristics(before, after, graph)
    log(f"heuristics done ({len(heuristic_results)} results)")
    log_subcheck_results(heuristic_results)

    task_instruction = load_task_instruction(instruction_path)

    log(f"running visual checks ({len(spec.get('visual') or [])} specs)")
    visual_results = run_all_visual_checks(
        specs=spec.get("visual"),
        before=before,
        after=after,
        graph=graph,
        before_path=str(before_path),
        after_path=str(after_path),
        work_dir=work,
        task_instruction=task_instruction,
        assets_dir=assets_dir,
        skip_llm=skip_llm,
        model=model,
        parallel=parallel,
        hfc_cli=hfc_cli,
    )
    log(f"visual checks done ({len(visual_results)} results)")
    log_subcheck_results(visual_results)

    subchecks = (
        gate_results + check_results + design_results + heuristic_results + visual_results
    )
    completion_gate = compute_completion_gate(gate_results, check_results, spec)
    report = aggregate_scores(spec, subchecks, completion_gate)

    report_dict: dict[str, Any] = {
        "score": report.score,
        "completion_gate": report.completion_gate,
        "raw": report.raw,
        "subchecks": [_subcheck_to_dict(s) for s in report.subchecks],
    }
    if report.summary:
        report_dict["summary"] = report.summary

    details_dict = build_eval_details(
        score_0_10=report.score,
        completion_gate=report.completion_gate,
        raw=report.raw,
        subchecks=report.subchecks,
    )

    out = Path(report_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report_dict, indent=2) + "\n", encoding="utf-8")

    details_path = out.parent / "eval-report-details.json"
    details_path.write_text(json.dumps(details_dict, indent=2) + "\n", encoding="utf-8")

    log(
        f"run_eval complete score={report.score} completion_gate={report.completion_gate} "
        f"subchecks={len(report.subchecks)}"
    )
    return report_dict


def run_eval_diff(before_path: str | Path, after_path: str | Path, out_path: str | Path) -> None:
    before = load_envelope(before_path)
    after = load_envelope(after_path)
    graph = build_edit_graph(before, after)
    payload = {
        "equal": graph.equal,
        "changes": [
            {
                "nodeId": c.node_id,
                "operation": c.operation,
                "changedProperties": c.changed_properties,
            }
            for c in graph.changes
        ],
        "added_ids": sorted(graph.added_ids),
        "deleted_ids": sorted(graph.deleted_ids),
        "modified_ids": sorted(graph.modified_ids),
    }
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
