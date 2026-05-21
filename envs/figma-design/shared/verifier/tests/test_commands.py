import json

from figma_eval.commands import command_correctness_score, run_command_checks


def test_command_correctness_all_success(tmp_path):
    issues_path = tmp_path / "issues.hfc.json"
    commands = [{"success": True, "at": "2026-01-01T00:00:00.000Z"} for _ in range(10)]
    issues_path.write_text(
        json.dumps({"schema_version": 1, "detached": [], "commands": commands}),
        encoding="utf-8",
    )
    result = command_correctness_score(issues_path)
    assert result.applicable is True
    assert result.score == 1.0
    assert result.details["success_count"] == 10
    assert result.details["capped"] is False


def test_command_correctness_capped_when_any_failure(tmp_path):
    issues_path = tmp_path / "issues.hfc.json"
    commands = [{"success": True, "at": "2026-01-01T00:00:00.000Z"} for _ in range(9)]
    commands.append({"success": False, "errorCode": "VALIDATION_ERROR", "at": "2026-01-01T00:00:01.000Z"})
    issues_path.write_text(
        json.dumps({"schema_version": 1, "detached": [], "commands": commands}),
        encoding="utf-8",
    )
    result = command_correctness_score(issues_path)
    assert result.applicable is True
    assert result.details["raw"] == 0.9
    assert result.score == 0.8
    assert result.details["capped"] is True


def test_command_correctness_four_of_five_caps_to_0_8(tmp_path):
    issues_path = tmp_path / "issues.hfc.json"
    commands = [{"success": True, "at": "2026-01-01T00:00:00.000Z"} for _ in range(4)]
    commands.append({"success": False, "errorCode": "VALIDATION_ERROR", "at": "2026-01-01T00:00:01.000Z"})
    issues_path.write_text(
        json.dumps({"schema_version": 1, "detached": [], "commands": commands}),
        encoding="utf-8",
    )
    result = command_correctness_score(issues_path)
    assert result.details["raw"] == 0.8
    assert result.score == 0.8
    assert result.details["capped"] is False


def test_command_correctness_all_failed_scores_zero(tmp_path):
    issues_path = tmp_path / "issues.hfc.json"
    issues_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "detached": [],
                "commands": [
                    {"success": False, "errorCode": "VALIDATION_ERROR", "at": "2026-01-01T00:00:00.000Z"},
                ],
            }
        ),
        encoding="utf-8",
    )
    result = command_correctness_score(issues_path)
    assert result.score == 0.0
    assert result.details["raw"] == 0.0


def test_command_correctness_skipped_without_commands(tmp_path):
    result = command_correctness_score(tmp_path / "missing.hfc.json")
    assert result.applicable is False
    assert result.score == 1.0

    empty_path = tmp_path / "empty-commands.hfc.json"
    empty_path.write_text(
        json.dumps({"schema_version": 1, "detached": []}),
        encoding="utf-8",
    )
    result2 = command_correctness_score(empty_path)
    assert result2.applicable is False


def test_run_command_checks_returns_single_subcheck(tmp_path):
    issues_path = tmp_path / "issues.hfc.json"
    issues_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "detached": [],
                "commands": [{"success": True, "at": "2026-01-01T00:00:00.000Z"}],
            }
        ),
        encoding="utf-8",
    )
    results = run_command_checks(issues_path=issues_path)
    assert len(results) == 1
    assert results[0].id == "commands.command_correctness"
