#!/usr/bin/env python3
"""Print a compact per-step summary of an ATIF trajectory."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import load_trajectory, summarize_trajectory


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("trajectory", type=Path, help="Path to trajectory.json")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON instead of text",
    )
    parser.add_argument(
        "--step",
        type=int,
        action="append",
        dest="steps",
        help="Only include these step IDs (repeatable)",
    )
    args = parser.parse_args()

    data = load_trajectory(args.trajectory)
    summaries = summarize_trajectory(data)
    if args.steps:
        summaries = [s for s in summaries if s.step_id in args.steps]

    if args.json:
        payload = [
            {
                "step_id": s.step_id,
                "source": s.source,
                "timestamp": s.timestamp,
                "message": s.message,
                "tools": [
                    {
                        "id": t.tool_call_id,
                        "name": t.tool_name or t.function_name,
                        "provider": t.provider,
                        "has_code": bool(t.code),
                    }
                    for t in s.tool_calls
                ],
                "issues": [
                    {"call_id": i.source_call_id, "kind": i.kind, "detail": i.detail}
                    for i in s.issues
                ],
            }
            for s in summaries
        ]
        json.dump(payload, sys.stdout, indent=2)
        return 0

    for s in summaries:
        tools = ", ".join(
            t.tool_name or t.function_name for t in s.tool_calls
        ) or "(none)"
        print(f"--- step {s.step_id} [{s.source}] ---")
        if s.message.strip():
            print(f"message: {s.message[:300]}")
        print(f"tools: {tools}")
        for issue in s.issues:
            print(f"  ISSUE [{issue.kind}] call={issue.source_call_id}: {issue.detail}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
