#!/usr/bin/env python3
"""Join trajectory issues with verifier eval-report / issues.hfc.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import load_trajectory, summarize_trajectory


def load_json(path: Path) -> dict | list | None:
    if not path.is_file():
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("trial_dir", type=Path, help="Job trial directory")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    trial = args.trial_dir
    traj_path = trial / "agent" / "trajectory.json"
    eval_path = trial / "verifier" / "eval-report.json"
    issues_path = trial / "artifacts" / "issues.hfc.json"
    if not issues_path.is_file():
        issues_path = trial / "verifier" / "issues.hfc.json"

    traj_issues = []
    if traj_path.is_file():
        for s in summarize_trajectory(load_trajectory(traj_path)):
            for issue in s.issues:
                traj_issues.append(
                    {
                        "step_id": s.step_id,
                        "kind": issue.kind,
                        "detail": issue.detail,
                    }
                )

    eval_report = load_json(eval_path) or {}
    failed_commands = []
    issues_doc = load_json(issues_path)
    if isinstance(issues_doc, dict) and "commands" in issues_doc:
        for i, cmd in enumerate(issues_doc["commands"]):
            if not cmd.get("success"):
                failed_commands.append({"index": i, **cmd})

    low_visual = []
    for sub in eval_report.get("subchecks", []):
        if sub.get("category") == "visual" and (sub.get("score") or 0) < 1.0:
            low_visual.append(sub)

    report = {
        "trial": str(trial),
        "reward": (load_json(trial / "verifier" / "reward.json") or {}).get(
            "reward"
        ),
        "trajectory_api_errors": traj_issues,
        "hfc_command_failures": failed_commands,
        "visual_subchecks_below_1": low_visual,
        "command_correctness": next(
            (
                s
                for s in eval_report.get("subchecks", [])
                if s.get("id") == "commands.command_correctness"
            ),
            None,
        ),
    }

    if args.json:
        json.dump(report, sys.stdout, indent=2)
        return 0

    print(f"Trial: {trial}")
    print(f"Reward: {report['reward']}")
    print("\nTrajectory API errors:")
    for e in traj_issues:
        print(f"  step {e['step_id']}: {e['detail']}")
    print("\nHFC command failures (issues.hfc.json):")
    for c in failed_commands:
        print(f"  #{c['index']}: {c.get('message')} @ {c.get('at')}")
    print("\nVisual checks below 1.0:")
    for v in low_visual:
        print(f"  {v.get('id')}: score={v.get('score')}")
        details = v.get("details") or {}
        reqs = details.get("requirements")
        if reqs:
            for r in reqs:
                mark = "OK" if r.get("satisfied") else "MISS"
                print(f"    [{mark}] {r.get('description')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
