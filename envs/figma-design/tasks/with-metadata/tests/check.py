import json
import os
import subprocess
from pathlib import Path

import rewardkit as rk
from rewardkit import criterion

EVAL_SPEC_PATH = Path("/tests/eval-spec.json")
BEFORE_PATH = Path("/tests/design.initial.hfc.json")
AFTER_PATH = Path("/data/workspace/design.hfc.json")
REPORT_PATH = Path("/logs/verifier/eval-report.json")
ASSETS_DIR = Path("/data/workspace/design.hfc.assets")


def _run_hfc_eval() -> dict:
    spec = EVAL_SPEC_PATH
    if not spec.exists():
        return {"score": 10.0, "completion_gate": 1.0, "raw": 1.0, "subchecks": [], "summary": "no eval-spec"}

    cmd = [
        "node",
        "/opt/hfc/dist/cli.js",
        "eval",
        "run",
        "--before",
        str(BEFORE_PATH),
        "--after",
        str(AFTER_PATH),
        "--spec",
        str(spec),
        "--report",
        str(REPORT_PATH),
        "--parallel",
        os.environ.get("EVAL_PARALLEL", "4"),
    ]
    if ASSETS_DIR.is_dir():
        cmd.extend(["--assets-dir", str(ASSETS_DIR)])
    if os.environ.get("EVAL_SKIP_LLM") == "1":
        cmd.append("--skip-llm")

    env = os.environ.copy()
    env.setdefault("EVAL_JUDGE_SCRIPT", "/opt/hfc/eval-llm/judge.py")

    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        raise RuntimeError(
            f"hfc eval run failed ({result.returncode}): {result.stderr}\n{result.stdout}"
        )

    if REPORT_PATH.exists():
        return json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    parsed = json.loads(result.stdout.strip() or "{}")
    return {
        "score": float(parsed.get("score", 0)),
        "completion_gate": 1.0,
        "raw": 0.0,
        "subchecks": [],
    }


@criterion
def figma_design_score(workspace: Path) -> float:
    del workspace
    report = _run_hfc_eval()
    details_path = Path("/logs/verifier/eval-report-details.json")
    try:
        details_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    except OSError:
        pass
    score_0_10 = float(report.get("score", 0))
    return max(0.0, min(1.0, score_0_10 / 10.0))


rk.figma_design_score(weight=1.0)
