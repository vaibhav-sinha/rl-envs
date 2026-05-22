#!/usr/bin/env python3
"""List API errors, warnings, and failed ok:false responses in a trajectory."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import load_trajectory, summarize_trajectory


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("trajectory", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    summaries = summarize_trajectory(load_trajectory(args.trajectory))
    rows = []
    for s in summaries:
        for issue in s.issues:
            rows.append(
                {
                    "step_id": s.step_id,
                    "source_call_id": issue.source_call_id,
                    "kind": issue.kind,
                    "detail": issue.detail,
                    "message_preview": s.message[:200],
                }
            )

    if args.json:
        json.dump(rows, sys.stdout, indent=2)
        return 0

    if not rows:
        print("No errors or warnings found in observations.")
        return 0

    for r in rows:
        print(
            f"step {r['step_id']} | {r['kind']} | call {r['source_call_id']}"
        )
        print(f"  {r['detail']}")
        if r["message_preview"]:
            print(f"  agent: {r['message_preview']}")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
