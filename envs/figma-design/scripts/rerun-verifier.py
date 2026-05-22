#!/usr/bin/env python3
"""
Re-run figma_eval verifiers on completed Harbor jobs without modifying job folders.

Reads trial artifacts and task specs from the job (read-only), stages copies in a
temp directory (so issues.hfc.json stays beside design.hfc.json), and writes fresh
verifier output under verifier-reruns/ (or --output).

Usage (from repository root):
  python envs/figma-design/scripts/rerun-verifier.py jobs/2026-05-22__01-30-40
  python envs/figma-design/scripts/rerun-verifier.py jobs/2026-05-22__01-30-40/oker-create-max-otp-screen__JoQCmsv
  python envs/figma-design/scripts/rerun-verifier.py jobs/2026-05-22__01-30-40 --skip-llm
  python envs/figma-design/scripts/rerun-verifier.py jobs/2026-05-22__01-30-40 -o verifier-reruns/my-run

Requires: pip install -r envs/figma-design/shared/verifier/requirements.txt
Optional: build HFC CLI (libs/headless-figma-clone) and set HFC_CLI for visual renders.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATASET_ROOT = SCRIPT_DIR.parent
REPO_ROOT = DATASET_ROOT.parent.parent
VERIFIER_ROOT = DATASET_ROOT / "shared" / "verifier"
DEFAULT_HFC_CLI = REPO_ROOT / "libs" / "headless-figma-clone" / "dist" / "cli.js"
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "verifier-reruns"


def _ensure_figma_eval_import() -> None:
    root = str(VERIFIER_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)


def _resolve_repo_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    return REPO_ROOT


def _resolve_path(path: str, repo_root: Path) -> Path:
    p = Path(path)
    if not p.is_absolute():
        p = repo_root / p
    return p.resolve()


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _discover_trials(target: Path) -> list[Path]:
    """Return trial directories under a job, or [target] if target is a single trial."""
    if (target / "result.json").is_file() and (target / "artifacts" / "design.hfc.json").is_file():
        return [target]

    trials: list[Path] = []
    if not target.is_dir():
        return trials

    for child in sorted(target.iterdir()):
        if not child.is_dir():
            continue
        if (child / "result.json").is_file() and (child / "artifacts" / "design.hfc.json").is_file():
            trials.append(child)
    return trials


def _task_paths_from_result(result: dict, repo_root: Path) -> dict[str, Path | None]:
    task_rel = (
        result.get("config", {}).get("task", {}).get("path")
        or result.get("task_id", {}).get("path")
    )
    if not task_rel:
        raise ValueError("trial result.json missing config.task.path / task_id.path")

    task_dir = _resolve_path(task_rel, repo_root)
    return {
        "task_dir": task_dir,
        "before": task_dir / "environment" / "design.hfc.json",
        "spec": task_dir / "tests" / "eval-spec.json",
        "instruction": task_dir / "instruction.md",
        "assets": task_dir / "environment" / "assets",
    }


def _stage_after_artifacts(trial_dir: Path, staging: Path) -> Path:
    """Copy agent artifacts into staging so issues.hfc.json is sibling to design.hfc.json."""
    artifacts = trial_dir / "artifacts"
    after = staging / "design.hfc.json"
    shutil.copy2(artifacts / "design.hfc.json", after)
    issues_src = artifacts / "issues.hfc.json"
    if issues_src.is_file():
        shutil.copy2(issues_src, staging / "issues.hfc.json")
    return after


def _original_reward(result: dict) -> float | None:
    rewards = result.get("verifier_result", {}).get("rewards", {})
    if "reward" in rewards:
        return float(rewards["reward"])
    return None


def _run_trial(
    *,
    trial_dir: Path,
    job_dir: Path | None,
    output_base: Path,
    repo_root: Path,
    skip_llm: bool,
    parallel: int,
    hfc_cli: str | None,
) -> Path:
    _ensure_figma_eval_import()
    from figma_eval.run import run_eval  # noqa: PLC0415

    result_path = trial_dir / "result.json"
    result = _load_json(result_path)
    paths = _task_paths_from_result(result, repo_root)

    for key in ("before", "spec", "instruction"):
        p = paths[key]
        if p is None or not Path(p).is_file():
            raise FileNotFoundError(f"Missing {key} for trial {trial_dir.name}: {p}")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    job_name = job_dir.name if job_dir else trial_dir.parent.name
    out_dir = output_base / job_name / trial_dir.name / run_id
    out_dir.mkdir(parents=True, exist_ok=True)
    screenshots = out_dir / "screenshots"
    report_path = out_dir / "eval-report.json"

    if hfc_cli:
        os.environ["HFC_CLI"] = hfc_cli

    with tempfile.TemporaryDirectory(prefix="figma-rerun-") as tmp:
        staging = Path(tmp)
        after_path = _stage_after_artifacts(trial_dir, staging)

        report = run_eval(
            before_path=paths["before"],
            after_path=after_path,
            spec_path=paths["spec"],
            instruction_path=paths["instruction"],
            report_path=report_path,
            work_dir=screenshots,
            assets_dir=str(paths["assets"]) if paths["assets"] and paths["assets"].is_dir() else None,
            parallel=parallel,
            skip_llm=skip_llm,
            hfc_cli=hfc_cli,
        )

    score = float(report.get("score", 0))
    reward = max(0.0, min(1.0, score / 10.0))
    reward_path = out_dir / "reward.json"
    reward_path.write_text(
        json.dumps({"reward": round(reward, 4)}, indent=2) + "\n",
        encoding="utf-8",
    )

    manifest = {
        "run_id": run_id,
        "source_job": str(job_dir.resolve()) if job_dir else str(trial_dir.parent.resolve()),
        "source_trial": str(trial_dir.resolve()),
        "task_dir": str(paths["task_dir"].resolve()),
        "skip_llm": skip_llm,
        "hfc_cli": hfc_cli or os.environ.get("HFC_CLI"),
        "original_reward": _original_reward(result),
        "rerun_reward": round(reward, 4),
        "score_0_10": score,
        "completion_gate": report.get("completion_gate"),
        "raw": report.get("raw"),
        "outputs": {
            "eval_report": str(report_path.resolve()),
            "eval_report_details": str((out_dir / "eval-report-details.json").resolve()),
            "reward": str(reward_path.resolve()),
            "screenshots": str(screenshots.resolve()),
        },
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    return out_dir


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Re-run figma_eval verifiers on completed jobs (job folder stays read-only)."
    )
    parser.add_argument(
        "path",
        help="Job directory (all trials) or single trial directory under jobs/",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help=f"Output root (default: {DEFAULT_OUTPUT_ROOT.relative_to(REPO_ROOT)})",
    )
    parser.add_argument(
        "--repo-root",
        default=None,
        help="Repository root for resolving relative task paths (default: auto)",
    )
    parser.add_argument(
        "--trial",
        action="append",
        default=[],
        metavar="NAME",
        help="Only rerun trials matching this directory name (repeatable)",
    )
    parser.add_argument(
        "--skip-llm",
        action="store_true",
        help="Skip LLM visual/metadata judges (structural checks only)",
    )
    parser.add_argument(
        "--parallel",
        type=int,
        default=int(os.environ.get("EVAL_PARALLEL", "1")),
        help="Parallel visual judge workers (default: 1 or EVAL_PARALLEL)",
    )
    parser.add_argument(
        "--hfc-cli",
        default=None,
        help="Path to HFC render CLI (default: libs/headless-figma-clone/dist/cli.js if present)",
    )
    args = parser.parse_args(argv)

    repo_root = _resolve_repo_root(args.repo_root)
    target = _resolve_path(args.path, repo_root)
    if not target.exists():
        print(f"error: path not found: {target}", file=sys.stderr)
        return 1

    output_base = _resolve_path(args.output, repo_root) if args.output else DEFAULT_OUTPUT_ROOT
    output_base.mkdir(parents=True, exist_ok=True)

    hfc_cli = args.hfc_cli
    if hfc_cli is None and DEFAULT_HFC_CLI.is_file():
        hfc_cli = str(DEFAULT_HFC_CLI.resolve())
    elif hfc_cli:
        hfc_cli = str(Path(hfc_cli).resolve())

    trials = _discover_trials(target)
    if args.trial:
        allowed = set(args.trial)
        trials = [t for t in trials if t.name in allowed]

    if not trials:
        print(
            f"error: no trials with artifacts/design.hfc.json under {target}",
            file=sys.stderr,
        )
        return 1

    job_dir = target.parent if len(trials) == 1 and trials[0] == target else target

    print(f"Rerunning {len(trials)} trial(s); output -> {output_base}")
    if args.skip_llm:
        os.environ["EVAL_SKIP_LLM"] = "1"
    else:
        os.environ.pop("EVAL_SKIP_LLM", None)

    errors = 0
    for trial_dir in trials:
        print(f"  {trial_dir.name} ...", end=" ", flush=True)
        try:
            out_dir = _run_trial(
                trial_dir=trial_dir,
                job_dir=job_dir,
                output_base=output_base,
                repo_root=repo_root,
                skip_llm=args.skip_llm,
                parallel=args.parallel,
                hfc_cli=hfc_cli,
            )
            manifest = _load_json(out_dir / "manifest.json")
            orig = manifest.get("original_reward")
            rerun = manifest.get("rerun_reward")
            delta = ""
            if orig is not None:
                delta = f" (was {orig})"
            print(f"reward={rerun}{delta} -> {out_dir.relative_to(repo_root)}")
        except Exception as exc:
            errors += 1
            print(f"FAILED: {exc}", file=sys.stderr)

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
