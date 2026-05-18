import json
import tempfile
from pathlib import Path

from figma_eval.run import run_eval


def test_run_eval_no_visual(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")

    with tempfile.TemporaryDirectory() as tmp:
        before_path = Path(tmp) / "before.hfc.json"
        after_path = Path(tmp) / "after.hfc.json"
        spec_path = Path(tmp) / "spec.json"
        report_path = Path(tmp) / "report.json"

        before_path.write_text(json.dumps(before), encoding="utf-8")
        after_path.write_text(json.dumps(after), encoding="utf-8")
        spec_path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "gates": {"require_change": True},
                    "checks": [
                        {
                            "id": "added",
                            "type": "min_added_under",
                            "parent_id": "I2",
                            "min": 1,
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        instruction_path = Path(tmp) / "instruction.md"
        instruction_path.write_text("Add a frame", encoding="utf-8")

        report = run_eval(
            before_path=before_path,
            after_path=after_path,
            spec_path=spec_path,
            instruction_path=instruction_path,
            report_path=report_path,
            work_dir=Path(tmp) / "screenshots",
            skip_llm=True,
        )

        assert 0 <= report["score"] <= 10
        assert report_path.is_file()

        details_path = Path(tmp) / "eval-report-details.json"
        assert details_path.is_file()
        details = json.loads(details_path.read_text(encoding="utf-8"))
        assert "reward" in details
        assert "categories" in details
        assert details["checks"][0]["id"] == "gates.require_change"
        assert details["checks"][0]["reward"] == 1.0

        ids = {s["id"] for s in report["subchecks"]}
        assert "check.added" in ids
