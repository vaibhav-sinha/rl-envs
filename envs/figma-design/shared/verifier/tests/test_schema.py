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
