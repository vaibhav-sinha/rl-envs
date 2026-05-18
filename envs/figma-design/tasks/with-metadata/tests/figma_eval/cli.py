#!/usr/bin/env python3
"""CLI for local figma-eval runs (Harbor task authoring)."""

from __future__ import annotations

import argparse
import json
import sys

from .run import run_eval, run_eval_diff
from .schema import get_eval_spec_json_schema


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="figma_eval")
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run")
    run_p.add_argument("--before", required=True)
    run_p.add_argument("--after", required=True)
    run_p.add_argument("--spec", required=True)
    run_p.add_argument("--instruction", required=True)
    run_p.add_argument("--report", required=True)
    run_p.add_argument("--assets-dir")
    run_p.add_argument("--parallel", type=int, default=4)
    run_p.add_argument("--skip-llm", action="store_true")

    diff_p = sub.add_parser("diff")
    diff_p.add_argument("--before", required=True)
    diff_p.add_argument("--after", required=True)
    diff_p.add_argument("--out", required=True)

    schema_p = sub.add_parser("schema")
    schema_p.add_argument("--out")

    args = parser.parse_args(argv)

    if args.command == "run":
        report = run_eval(
            before_path=args.before,
            after_path=args.after,
            spec_path=args.spec,
            instruction_path=args.instruction,
            report_path=args.report,
            assets_dir=args.assets_dir,
            parallel=args.parallel,
            skip_llm=args.skip_llm,
        )
        print(json.dumps({"score": report["score"]}))
        return 0

    if args.command == "diff":
        run_eval_diff(args.before, args.after, args.out)
        return 0

    if args.command == "schema":
        text = json.dumps(get_eval_spec_json_schema(), indent=2) + "\n"
        if args.out:
            with open(args.out, "w", encoding="utf-8") as f:
                f.write(text)
        else:
            print(text, end="")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
