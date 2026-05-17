from pathlib import Path

import rewardkit as rk
from rewardkit import criterion


@criterion
def dummy_primary_passes(workspace: Path) -> float:
    return 1.0


rk.dummy_primary_passes(weight=0.8)
