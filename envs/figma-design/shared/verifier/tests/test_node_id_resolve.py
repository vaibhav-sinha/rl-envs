import json
from pathlib import Path

import pytest

from figma_eval.catalog import build_catalog, component_exists
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
    / "jobs/2026-05-22__00-48-07/oker-create-max-otp-screen__DR3WQEj/artifacts/design.hfc.json"
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


def test_resolve_source_figma_id_prefers_component_over_frame():
    envelope = {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "children": [
                        {
                            "id": "I10",
                            "type": "COMPONENT",
                            "name": "Master",
                            "sourceFigmaId": "99:1",
                            "children": [],
                        },
                        {
                            "id": "I11",
                            "type": "FRAME",
                            "name": "DetachedCopy",
                            "sourceFigmaId": "99:1",
                            "children": [],
                        },
                    ],
                }
            ],
        }
    }
    assert resolve_config_node_id(envelope, "99:1") == "I10"


def test_oker_component_in_catalog_by_figma_id():
    if not OKER_BEFORE.is_file():
        pytest.skip("oker before fixture not present")
    before = json.loads(OKER_BEFORE.read_text(encoding="utf-8"))
    catalog = build_catalog(before)
    assert resolve_config_node_id(before, "2382:161267") == "I48824"
    assert component_exists(catalog, before, "2382:161267") is True


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
    assert node_id == "I78386"
    node = find_node(after, node_id)
    assert node is not None
    assert node.get("name") == "Onboarding/OTP/MaxAttempts"
    assert node.get("type") == "FRAME"
