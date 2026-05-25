import os
from pathlib import Path

from rewardkit import criterion

from figma_eval.log import log
from figma_eval.run import run_eval

EVAL_SPEC_PATH = Path("/tests/eval-spec.json")
INSTRUCTION_PATH = Path("/tests/instruction.md")
BEFORE_PATH = Path("/tests/design.initial.hfc.json")
AFTER_PATH = Path("/data/workspace/design.hfc.json")
REPORT_PATH = Path("/logs/verifier/eval-report.json")
SCREENSHOTS_DIR = Path("/logs/verifier/screenshots")
# Task reference images (eval-spec reference_asset) ship in environment/assets/ → /app/assets/.
ASSETS_DIR = Path("/app/assets")


@criterion
def figma_design_score(workspace: Path) -> float:
    del workspace

    if not EVAL_SPEC_PATH.exists():
        log("no eval-spec.json; returning perfect score")
        return 1.0

    log("figma_design_score: starting evaluation")
    report = run_eval(
        before_path=BEFORE_PATH,
        after_path=AFTER_PATH,
        spec_path=EVAL_SPEC_PATH,
        instruction_path=INSTRUCTION_PATH,
        report_path=REPORT_PATH,
        work_dir=SCREENSHOTS_DIR,
        assets_dir=str(ASSETS_DIR) if ASSETS_DIR.is_dir() else None,
        parallel=int(os.environ.get("EVAL_PARALLEL", "1")),
        skip_llm=os.environ.get("EVAL_SKIP_LLM") == "1",
        hfc_cli=os.environ.get("HFC_CLI", "/opt/hfc/dist/cli.js"),
    )

    score_0_10 = float(report.get("score", 0))
    reward = max(0.0, min(1.0, score_0_10 / 10.0))
    log(f"figma_design_score: reward={reward:.4f} (score_0_10={score_0_10})")
    return reward
