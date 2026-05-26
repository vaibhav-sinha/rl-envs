#!/usr/bin/env python3
"""CLI for local figma-eval runs (Harbor task authoring)."""

from __future__ import annotations

import argparse
import json
import os
import sys

from .run import run_eval, run_eval_diff
from .schema import get_eval_spec_json_schema
from .visual.instruction import load_task_instruction
from .visual.score_image import load_criteria_file, load_visual_check_from_spec, score_image


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
    run_p.add_argument("--parallel", type=int, default=1)
    run_p.add_argument("--skip-llm", action="store_true")

    diff_p = sub.add_parser("diff")
    diff_p.add_argument("--before", required=True)
    diff_p.add_argument("--after", required=True)
    diff_p.add_argument("--out", required=True)

    schema_p = sub.add_parser("schema")
    schema_p.add_argument("--out")

    score_p = sub.add_parser(
        "score-image",
        help="Score a screenshot with LLM visual checks (no full verifier run).",
    )
    score_p.add_argument("--image", required=True)
    score_p.add_argument(
        "--check-type",
        choices=[
            "good_design",
            "task_completeness",
            "design_consistency",
            "design_preference",
            "custom_criteria",
        ],
    )
    score_p.add_argument("--eval-spec")
    score_p.add_argument("--check-id")
    score_p.add_argument("--instruction")
    score_p.add_argument("--instruction-text")
    score_p.add_argument("--reference")
    score_p.add_argument("--assets-dir")
    score_p.add_argument("--criteria", action="append", dest="criteria_items")
    score_p.add_argument("--criteria-file")
    score_p.add_argument("--prompt-file")
    score_p.add_argument("--evaluation-instructions")
    score_p.add_argument(
        "--model",
        default=os.environ.get("EVAL_JUDGE_MODEL", "gemini/gemini-3.1-pro-preview"),
    )
    score_p.add_argument("--output", "-o")
    score_p.add_argument("--pretty", action="store_true")

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

    if args.command == "score-image":
        visual_check = None
        check_type = args.check_type
        if args.eval_spec:
            if not args.check_id:
                print("error: --check-id is required with --eval-spec", file=sys.stderr)
                return 2
            visual_check = load_visual_check_from_spec(args.eval_spec, args.check_id)
            check_type = str(visual_check.get("type", check_type or ""))
        if not check_type:
            print("error: provide --check-type or --eval-spec with --check-id", file=sys.stderr)
            return 2
        if args.instruction_text:
            task_instruction = args.instruction_text.strip()
        elif args.instruction:
            task_instruction = load_task_instruction(args.instruction)
        else:
            print("error: --instruction or --instruction-text is required", file=sys.stderr)
            return 2
        criteria = list(args.criteria_items) if args.criteria_items else None
        if args.criteria_file:
            criteria = load_criteria_file(args.criteria_file)
        result = score_image(
            image=args.image,
            check_type=check_type,
            task_instruction=task_instruction,
            model=args.model,
            reference=args.reference,
            criteria=criteria,
            visual_check=visual_check,
            assets_dir=args.assets_dir,
            prompt_file=args.prompt_file,
            evaluation_instructions=args.evaluation_instructions,
        )
        if visual_check:
            result["check_id"] = visual_check.get("id")
            result["eval_spec"] = str(args.eval_spec)
        result["model"] = args.model
        indent = 2 if args.pretty else None
        text = json.dumps(result, indent=indent) + "\n"
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"Wrote {args.output}", file=sys.stderr)
        else:
            print(text, end="")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
