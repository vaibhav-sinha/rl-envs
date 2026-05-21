import json
import tempfile
from pathlib import Path

import pytest

from figma_eval.schema import get_eval_spec_json_schema, load_and_validate_eval_spec


def test_valid_minimal_spec():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"schema_version": 1, "checks": []}, f)
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["schema_version"] == 1
    finally:
        Path(path).unlink(missing_ok=True)


def test_unknown_check_type_rejected():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "checks": [{"id": "x", "type": "not_a_real_type", "node_id": "I1"}],
            },
            f,
        )
        path = f.name
    try:
        with pytest.raises(Exception):
            load_and_validate_eval_spec(path)
    finally:
        Path(path).unlink(missing_ok=True)


def test_schema_file_loads():
    schema = get_eval_spec_json_schema()
    assert schema.get("type") == "object"


def test_design_system_spec_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "design_system": {"allow_novelty": False},
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["design_system"]["allow_novelty"] is False
    finally:
        Path(path).unlink(missing_ok=True)


def test_visual_good_design_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "visual": [{"id": "gd1", "type": "good_design"}],
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["visual"][0]["type"] == "good_design"
    finally:
        Path(path).unlink(missing_ok=True)


def test_visual_design_consistency_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "visual": [
                    {
                        "id": "dc1",
                        "type": "design_consistency",
                        "reference_asset": "ref.png",
                        "criteria": ["Same background pattern"],
                    }
                ],
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["visual"][0]["type"] == "design_consistency"
    finally:
        Path(path).unlink(missing_ok=True)


def test_visual_design_fit_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "visual": [
                    {
                        "id": "df1",
                        "type": "design_fit",
                        "node_id": "I1",
                        "evaluation_prompt": "Check integration with parent frame.",
                    }
                ],
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["visual"][0]["type"] == "design_fit"
    finally:
        Path(path).unlink(missing_ok=True)


def test_task_completeness_with_evaluation_instructions_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "visual": [
                    {
                        "id": "tc1",
                        "type": "task_completeness",
                        "evaluation_instructions": "Ignore placeholder lorem ipsum text.",
                    }
                ],
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert (
            spec["visual"][0]["evaluation_instructions"]
            == "Ignore placeholder lorem ipsum text."
        )
    finally:
        Path(path).unlink(missing_ok=True)


def test_design_preference_visual_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "visual": [
                    {
                        "id": "dp1",
                        "type": "design_preference",
                        "reference_asset": "target.png",
                    }
                ],
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["visual"][0]["type"] == "design_preference"
    finally:
        Path(path).unlink(missing_ok=True)


def test_metadata_diff_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "metadata_checks": [{"id": "d1", "type": "diff"}],
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["metadata_checks"][0]["type"] == "diff"
    finally:
        Path(path).unlink(missing_ok=True)


def test_legacy_visual_types_rejected():
    for legacy_type, extra in [
        ("before_vs_after", {"surrounding_context_node_id": "I1"}),
        ("compare_with_reference", {"reference_asset": "x.png"}),
        ("diff", {}),
    ]:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(
                {
                    "schema_version": 1,
                    "visual": [{"id": "v1", "type": legacy_type, **extra}],
                },
                f,
            )
            path = f.name
        try:
            with pytest.raises(Exception):
                load_and_validate_eval_spec(path)
        finally:
            Path(path).unlink(missing_ok=True)


def test_legacy_visual_spec_rejected():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "visual": [
                    {
                        "id": "v1",
                        "region_id": "I1",
                        "mode": "relative_to_siblings",
                        "instruction": "test",
                    }
                ],
            },
            f,
        )
        path = f.name
    try:
        with pytest.raises(Exception):
            load_and_validate_eval_spec(path)
    finally:
        Path(path).unlink(missing_ok=True)
