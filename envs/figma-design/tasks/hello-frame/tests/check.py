import json
import os
from pathlib import Path

import rewardkit as rk
from rewardkit import criterion

from figma_eval.run import run_eval

EVAL_SPEC_PATH = Path("/tests/eval-spec.json")
BEFORE_PATH = Path("/tests/design.initial.hfc.json")
AFTER_PATH = Path("/data/workspace/design.hfc.json")
REPORT_PATH = Path("/logs/verifier/eval-report.json")
ASSETS_DIR = Path("/data/workspace/design.hfc.assets")


@criterion
def figma_design_score(workspace: Path) -> float:
    del workspace

    if not EVAL_SPEC_PATH.exists():
        raise ValueError(f"EVAL_SPEC_PATH does not exist: {EVAL_SPEC_PATH}")

    report = run_eval(
        before_path=BEFORE_PATH,
        after_path=AFTER_PATH,
        spec_path=EVAL_SPEC_PATH,
        report_path=REPORT_PATH,
        assets_dir=str(ASSETS_DIR) if ASSETS_DIR.is_dir() else None,
        parallel=int(os.environ.get("EVAL_PARALLEL", "4")),
        skip_llm=os.environ.get("EVAL_SKIP_LLM") == "1",
        hfc_cli=os.environ.get("HFC_CLI", "/opt/hfc/dist/cli.js"),
    )

    details_path = Path("/logs/verifier/eval-report-details.json")
    try:
        details_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    except OSError:
        pass

    score_0_10 = float(report.get("score", 0))
    return max(0.0, min(1.0, score_0_10 / 10.0))


rk.figma_design_score(weight=1.0)
