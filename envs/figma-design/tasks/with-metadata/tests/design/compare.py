import json
from pathlib import Path
from typing import Any


def load_design(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected design envelope object at {path}")
    return data


def normalize_design(envelope: dict[str, Any]) -> dict[str, Any]:
    def sort_value(value: Any) -> Any:
        if isinstance(value, dict):
            return {key: sort_value(value[key]) for key in sorted(value)}
        if isinstance(value, list):
            return [sort_value(item) for item in value]
        return value

    return sort_value(envelope)


def diff_designs(initial: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    """Return a structural diff between two normalized design envelopes."""

    def walk(path: str, left: Any, right: Any, changes: dict[str, Any]) -> None:
        if type(left) is not type(right):
            changes[path or "$"] = {"initial": left, "current": right}
            return
        if isinstance(left, dict):
            keys = set(left) | set(right)
            for key in sorted(keys):
                child = f"{path}.{key}" if path else key
                if key not in left:
                    changes[child] = {"initial": None, "current": right[key]}
                elif key not in right:
                    changes[child] = {"initial": left[key], "current": None}
                else:
                    walk(child, left[key], right[key], changes)
            return
        if isinstance(left, list):
            if left != right:
                changes[path or "$"] = {"initial": left, "current": right}
            return
        if left != right:
            changes[path or "$"] = {"initial": left, "current": right}

    changes: dict[str, Any] = {}
    walk("", initial, current, changes)
    return {"equal": not changes, "changes": changes}
