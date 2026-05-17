import json
from pathlib import Path

import rewardkit as rk
from rewardkit import criterion

METADATA_PATH = Path("/tests/design-metadata.json")


@criterion
def metadata_checks(workspace: Path) -> float:
    if not METADATA_PATH.exists():
        return 1.0
    data = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        return 0.0
    # Placeholder until design-metadata schema is defined.
    return 1.0


rk.metadata_checks()
