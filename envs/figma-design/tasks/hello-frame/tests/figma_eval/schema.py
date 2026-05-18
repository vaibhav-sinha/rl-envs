from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import jsonschema

_SCHEMA_PATH = Path(__file__).resolve().parent.parent / "eval-spec.schema.json"


def get_eval_spec_json_schema() -> dict[str, Any]:
    return json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))


def load_and_validate_eval_spec(spec_path: str | Path) -> dict[str, Any]:
    raw = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    schema = get_eval_spec_json_schema()
    jsonschema.validate(instance=raw, schema=schema)
    return raw
