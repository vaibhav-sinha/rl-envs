#!/usr/bin/env python3
"""Throwaway: print metadata diff prompt sent to LLM for a Harbor trial (no re-verify)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
VERIFIER_ROOT = REPO / "envs" / "figma-design" / "shared" / "verifier"
sys.path.insert(0, str(VERIFIER_ROOT))

from figma_eval.edit_graph import build_edit_graph, format_diff_summary  # noqa: E402
from figma_eval.metadata.prompts import build_diff_prompt  # noqa: E402
from figma_eval.run import load_envelope  # noqa: E402

TRIAL = REPO / "jobs" / "2026-05-25__20-06-15" / "oker-create-apply-styles__3xa82uB"
TASK = REPO / "envs" / "figma-design" / "tasks" / "oker-create-apply-styles"
BEFORE = REPO / "envs" / "figma-design" / "designs" / "oker-final-design" / "design.hfc.json"
AFTER = TRIAL / "artifacts" / "design.hfc.json"
INSTRUCTION = TASK / "instruction.md"


def main() -> None:
    before = load_envelope(BEFORE)
    after = load_envelope(AFTER)
    graph = build_edit_graph(before, after)
    diff_summary = format_diff_summary(graph, before=before, after=after)
    task_instruction = INSTRUCTION.read_text(encoding="utf-8").strip()
    prompt = build_diff_prompt(task_instruction=task_instruction, diff_summary=diff_summary)

    print("=== edit graph stats ===")
    print(
        json.dumps(
            {
                "equal": graph.equal,
                "added": len(graph.added_ids),
                "deleted": len(graph.deleted_ids),
                "modified": len(graph.modified_ids),
                "total_changes": len(graph.changes),
            },
            indent=2,
        )
    )
    print()
    print("=== diff_summary (embedded in prompt) ===")
    print(diff_summary)
    print()
    print("=== full LLM prompt (metadata.diff_1) ===")
    print(prompt)


if __name__ == "__main__":
    main()
