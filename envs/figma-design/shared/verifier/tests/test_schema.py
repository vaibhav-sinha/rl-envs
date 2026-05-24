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


def _allow_novelty_object(**overrides: object) -> dict:
    base = {
        "text": {
            "color": False,
            "font_size": False,
            "font_family": False,
            "font_weight": False,
        },
        "frames": {
            "fill": False,
            "background": True,
            "stroke_color": False,
            "stroke_width": False,
            "corner_radius": False,
            "effects": False,
            "item_spacing": False,
            "counter_axis_spacing": False,
            "padding": False,
            "layout_grid": False,
        },
    }
    for key, val in overrides.items():
        if key in base["text"]:
            base["text"][key] = val
        elif key in base["frames"]:
            base["frames"][key] = val
    return base


def test_design_system_spec_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "design_system": {"allow_novelty": _allow_novelty_object()},
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["design_system"]["allow_novelty"]["frames"]["background"] is True
    finally:
        Path(path).unlink(missing_ok=True)


def test_design_system_boolean_novelty_rejected():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "design_system": {"allow_novelty": True},
            },
            f,
        )
        path = f.name
    try:
        with pytest.raises(Exception):
            load_and_validate_eval_spec(path)
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


def test_screenshot_auto_validates():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "screenshot": {"strategy": "auto"},
            },
            f,
        )
        path = f.name
    try:
        spec = load_and_validate_eval_spec(path)
        assert spec["screenshot"]["strategy"] == "auto"
    finally:
        Path(path).unlink(missing_ok=True)


def test_screenshot_explicit_requires_node_ids():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(
            {
                "schema_version": 1,
                "screenshot": {"strategy": "explicit"},
            },
            f,
        )
        path = f.name
    try:
        with pytest.raises(Exception):
            load_and_validate_eval_spec(path)
    finally:
        Path(path).unlink(missing_ok=True)


def test_task_eval_specs_validate():
    repo = Path(__file__).resolve().parents[5]
    task_specs = list((repo / "envs/figma-design/tasks").glob("*/tests/eval-spec.json"))
    assert len(task_specs) >= 5
    for spec_path in task_specs:
        spec = load_and_validate_eval_spec(spec_path)
        assert spec.get("screenshot", {}).get("strategy") == "auto"
