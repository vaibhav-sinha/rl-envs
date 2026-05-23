#!/usr/bin/env python3
"""Score a screenshot with LLM visual checks — no full verifier run required.

Examples:

  # Reproduce good_design scoring from a job screenshot
  python scripts/score_visual.py \\
    --image ../../jobs/.../design_consistency_3-agent.png \\
    --check-type good_design \\
    --instruction ../../tasks/oker-create-sale-section/instruction.md

  # Run a specific visual check from eval-spec (includes criteria + reference)
  python scripts/score_visual.py \\
    --image agent.png \\
    --eval-spec ../../tasks/oker-create-sale-section/tests/eval-spec.json \\
    --check-id design_consistency_3 \\
    --instruction ../../tasks/oker-create-sale-section/instruction.md \\
    --assets-dir ../../tasks/oker-create-sale-section/environment/assets

  # Experiment with custom criteria (single-image strict rubric)
  python scripts/score_visual.py \\
    --image agent.png \\
    --check-type custom_criteria \\
    --criteria-file scripts/example-criteria/sale-section-strict.json \\
    --instruction ../../tasks/oker-create-sale-section/instruction.md

  # Full prompt control for rubric iteration
  python scripts/score_visual.py \\
    --image agent.png \\
    --prompt-file my_prompt.txt \\
    --criteria-file my_criteria.json \\
    --instruction instruction.md
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Allow running as `python scripts/score_visual.py` from verifier root.
_VERIFIER_ROOT = Path(__file__).resolve().parents[1]
if str(_VERIFIER_ROOT) not in sys.path:
    sys.path.insert(0, str(_VERIFIER_ROOT))

from figma_eval.visual.instruction import load_task_instruction
from figma_eval.visual.score_image import (
    load_criteria_file,
    load_visual_check_from_spec,
    score_image,
)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Score a screenshot with figma-eval LLM visual checks (standalone)."
    )
    parser.add_argument(
        "--image",
        required=True,
        help="Path to the agent/design screenshot PNG.",
    )
    parser.add_argument(
        "--check-type",
        choices=[
            "good_design",
            "task_completeness",
            "design_consistency",
            "design_preference",
            "custom_criteria",
        ],
        help="Visual check type. Not required when --eval-spec + --check-id is used.",
    )
    parser.add_argument(
        "--eval-spec",
        help="eval-spec.json path; use with --check-id to load check config.",
    )
    parser.add_argument(
        "--check-id",
        help="Visual check id inside eval-spec (e.g. design_consistency_3).",
    )
    parser.add_argument(
        "--instruction",
        help="Task instruction markdown file. Alternatively set --instruction-text.",
    )
    parser.add_argument(
        "--instruction-text",
        help="Inline task instruction (overrides --instruction when both set).",
    )
    parser.add_argument(
        "--reference",
        help="Reference PNG for design_consistency / design_preference.",
    )
    parser.add_argument(
        "--assets-dir",
        help="Directory for eval-spec reference_asset resolution.",
    )
    parser.add_argument(
        "--criteria",
        action="append",
        dest="criteria_items",
        help="Criterion text (repeatable). Alternative to --criteria-file.",
    )
    parser.add_argument(
        "--criteria-file",
        help="JSON array or newline-delimited criteria list.",
    )
    parser.add_argument(
        "--prompt-file",
        help="Custom judge prompt (requires --criteria or --criteria-file).",
    )
    parser.add_argument(
        "--evaluation-instructions",
        help="Extra instructions for task_completeness.",
    )
    parser.add_argument(
        "--model",
        default=os.environ.get("EVAL_JUDGE_MODEL", "gemini/gemini-3-flash-preview"),
        help="LiteLLM model id (default: EVAL_JUDGE_MODEL or gemini/gemini-3-flash-preview).",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Write JSON result to this path (default: stdout).",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

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

    criteria: list[str] | None = None
    if args.criteria_items:
        criteria = list(args.criteria_items)
    elif args.criteria_file:
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
        result["eval_spec"] = str(Path(args.eval_spec).resolve())
    result["model"] = args.model

    indent = 2 if args.pretty else None
    text = json.dumps(result, indent=indent) + "\n"
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
        print(f"Wrote {args.output}", file=sys.stderr)
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
