import json
from pathlib import Path

import pytest

from figma_eval.edit_graph import build_edit_graph
from figma_eval.gates import run_gates
from figma_eval.tree import (
    clear_node_ref_index_cache,
    find_node,
    resolve_config_node_id,
    resolve_task_completeness_screenshot_node,
)

_REPO_ROOT = Path(__file__).resolve().parents[5]
OKER_BEFORE = (
    _REPO_ROOT
    / "envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json"
)
OKER_AFTER_JOB = (
    _REPO_ROOT
    / "jobs/2026-05-21__21-48-53/oker-create-max-otp-screen__AU5hEZx/artifacts/design.hfc.json"
)


@pytest.fixture(autouse=True)
def _clear_index_cache():
    clear_node_ref_index_cache()
    yield
    clear_node_ref_index_cache()


def test_resolve_config_node_id_by_source_figma_id():
    envelope = {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "sourceFigmaId": "0:0",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "sourceFigmaId": "0:1",
                    "children": [
                        {
                            "id": "I3",
                            "type": "FRAME",
                            "name": "Screen",
                            "sourceFigmaId": "1:2",
                            "width": 100,
                            "height": 200,
                            "children": [],
                        }
                    ],
                }
            ],
        }
    }
    assert resolve_config_node_id(envelope, "1:2") == "I3"
    assert resolve_config_node_id(envelope, "I3") == "I3"
    assert resolve_config_node_id(envelope, "missing:99") is None
    assert find_node(envelope, "1:2")["name"] == "Screen"


def test_allowed_change_inside_gate_accepts_figma_root_id():
    if not OKER_BEFORE.is_file() or not OKER_AFTER_JOB.is_file():
        pytest.skip("oker job fixtures not present")
    before = json.loads(OKER_BEFORE.read_text(encoding="utf-8"))
    after = json.loads(OKER_AFTER_JOB.read_text(encoding="utf-8"))
    graph = build_edit_graph(before, after)
    results = run_gates(
        before,
        after,
        graph,
        {"allowed_change_inside_ids": ["1621:130309"]},
    )
    gate = next(r for r in results if r.id == "gates.allowed_change_inside")
    assert gate.score == 1.0


def test_task_completeness_screenshot_with_figma_allowed_root():
    if not OKER_BEFORE.is_file() or not OKER_AFTER_JOB.is_file():
        pytest.skip("oker job fixtures not present")
    before = json.loads(OKER_BEFORE.read_text(encoding="utf-8"))
    after = json.loads(OKER_AFTER_JOB.read_text(encoding="utf-8"))
    graph = build_edit_graph(before, after)
    node_id = resolve_task_completeness_screenshot_node(
        after,
        before,
        graph,
        allowed_root_ids=["1621:130309"],
    )
    assert node_id == "I78923"
    node = find_node(after, node_id)
    assert node is not None
    assert node.get("name") == "Onboarding/OTP/MaxAttempts"
    assert node.get("type") == "FRAME"
