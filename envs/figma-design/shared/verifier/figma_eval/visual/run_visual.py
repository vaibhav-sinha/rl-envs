from __future__ import annotations

import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from ..edit_graph import resolve_focus_node_id
from ..hfc_render import render_node
from ..judge import run_visual_judge
from ..tree import node_exists
from ..types import Envelope, SubCheckResult
from .prompts import build_visual_prompt

STAGE1_FAIL_CAP = 0.2


def _buffer_phash_similarity(a: bytes, b: bytes) -> float:
    ha = hashlib.sha256(a).hexdigest()
    hb = hashlib.sha256(b).hexdigest()
    return 1.0 if ha == hb else 0.0


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


def run_visual_check(
    *,
    spec: dict[str, Any],
    before: Envelope,
    after: Envelope,
    before_path: str,
    after_path: str,
    work_dir: str | Path,
    assets_dir: str | None = None,
    skip_llm: bool = False,
    model: str,
    hfc_cli: str | None = None,
) -> SubCheckResult:
    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)

    if not node_exists(after, spec["region_id"]):
        return _visual_result(spec, STAGE1_FAIL_CAP, {"stage1": "region_missing_in_after"})

    before_region = work / f"{spec['id']}-before.png"
    after_region = work / f"{spec['id']}-after.png"

    render_node(file=before_path, node_id=spec["region_id"], out=before_region, hfc_cli=hfc_cli)
    render_node(file=after_path, node_id=spec["region_id"], out=after_region, hfc_cli=hfc_cli)

    before_buf = before_region.read_bytes()
    after_buf = after_region.read_bytes()
    if _buffer_phash_similarity(before_buf, after_buf) >= 1.0:
        return _visual_result(spec, STAGE1_FAIL_CAP, {"stage1": "no_visible_change"})

    if spec.get("mode") == "match_asset":
        if not spec.get("reference_asset"):
            return _visual_result(spec, STAGE1_FAIL_CAP, {"stage1": "missing_reference_asset"})
        ref = spec["reference_asset"]
        ref_path = Path(ref) if ref.startswith("/") else Path(assets_dir or "/app/assets") / ref
        if not ref_path.is_file():
            return _visual_result(
                spec, STAGE1_FAIL_CAP, {"stage1": "reference_file_missing", "path": str(ref_path)}
            )

    if skip_llm:
        return _visual_result(spec, 0.75, {"stage1": "pass", "llm": "skipped"})

    focus_node_id = resolve_focus_node_id(
        before,
        after,
        spec["region_id"],
        spec.get("focus") or "largest_added",
    )
    focus_path = work / f"{spec['id']}-focus.png"
    render_node(file=after_path, node_id=focus_node_id, out=focus_path, hfc_cli=hfc_cli)

    image_list: list[dict[str, str]] = [
        {"role": "before", "path": str(before_region)},
        {"role": "after", "path": str(after_region)},
        {"role": "focus", "path": str(focus_path)},
    ]

    if spec.get("mode") == "match_asset":
        ref = spec["reference_asset"]
        ref_path = Path(ref) if ref.startswith("/") else Path(assets_dir or "/app/assets") / ref
        image_list.append({"role": "reference", "path": str(ref_path)})

    llm = run_visual_judge(
        prompt=build_visual_prompt(spec),
        images=image_list,
        model=model,
    )
    return _visual_result(spec, llm["mean_score"], {"stage1": "pass", "llm": llm.get("dimensions")})


def run_all_visual_checks(
    *,
    specs: list[dict[str, Any]] | None,
    before: Envelope,
    after: Envelope,
    before_path: str,
    after_path: str,
    work_dir: str | Path,
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
            before_path=before_path,
            after_path=after_path,
            work_dir=work_dir,
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
