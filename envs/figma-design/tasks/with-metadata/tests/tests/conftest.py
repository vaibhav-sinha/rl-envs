from __future__ import annotations

import json
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def load_fixture():
    def _load(name: str, variant: str):
        path = FIXTURES_DIR / f"{name}.{variant}.hfc.json"
        return json.loads(path.read_text(encoding="utf-8"))

    return _load
