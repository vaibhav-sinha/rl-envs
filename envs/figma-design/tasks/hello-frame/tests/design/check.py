import importlib.util
import json
from pathlib import Path

import rewardkit as rk
from rewardkit import criterion

_DESIGN_DIR = Path(__file__).resolve().parent


def _load_sibling(module_name: str):
    path = _DESIGN_DIR / f"{module_name}.py"
    spec = importlib.util.spec_from_file_location(f"_design_{module_name}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_compare = _load_sibling("compare")
_paths = _load_sibling("paths")

METADATA_PATH = Path("/tests/design-metadata.json")


@criterion
def design_diff_checks(workspace: Path) -> float:
    if not METADATA_PATH.exists():
        return 1.0
    data = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not data.get("check_design_diff"):
        return 1.0
    if not _paths.INITIAL_DESIGN_PATH.exists() or not _paths.WORKSPACE_DESIGN_PATH.exists():
        return 0.0

    initial = _compare.normalize_design(_compare.load_design(_paths.INITIAL_DESIGN_PATH))
    current = _compare.normalize_design(_compare.load_design(_paths.WORKSPACE_DESIGN_PATH))
    result = _compare.diff_designs(initial, current)

    if data.get("require_design_change") and result["equal"]:
        return 0.0

    expected_changes = data.get("expected_changes")
    if expected_changes is not None and expected_changes != result["changes"]:
        return 0.0

    return 1.0


rk.design_diff_checks()
