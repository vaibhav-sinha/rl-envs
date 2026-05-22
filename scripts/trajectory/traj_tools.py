#!/usr/bin/env python3
"""Extract use_figma plugin code and results from trajectory steps."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import find_use_figma_results, load_trajectory, summarize_step


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("trajectory", type=Path)
    parser.add_argument("--step", type=int, required=True)
    parser.add_argument(
        "--code-only",
        action="store_true",
        help="Print plugin code blocks only",
    )
    parser.add_argument(
        "--result-only",
        action="store_true",
        help="Print parsed use_figma results only",
    )
    args = parser.parse_args()

    data = load_trajectory(args.trajectory)
    step = next(
        (s for s in data.get("steps", []) if s.get("step_id") == args.step),
        None,
    )
    if step is None:
        print(f"Step {args.step} not found", file=sys.stderr)
        return 1

    summ = summarize_step(step)
    if not args.result_only:
        for i, tc in enumerate(summ.tool_calls):
            if not tc.code:
                continue
            print(f"### tool_call {i + 1} ({tc.tool_call_id})")
            print(tc.code)
            if not tc.code.endswith("\n"):
                print()

    if not args.code_only:
        results = find_use_figma_results(data, step_id=args.step)
        for sid, cid, result in results:
            print(f"### result {cid}")
            print(json.dumps(result, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
