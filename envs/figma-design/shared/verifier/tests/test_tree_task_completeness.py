import json
from pathlib import Path

from figma_eval.edit_graph import build_edit_graph

_REPO_ROOT = Path(__file__).resolve().parents[5]
from figma_eval.tree import resolve_task_completeness_screenshot_node


def _frame(fid: str, name: str, w: int, h: int, children: list | None = None) -> dict:
    return {
        "id": fid,
        "type": "FRAME",
        "name": name,
        "x": 0,
        "y": 0,
        "width": w,
        "height": h,
        "children": children or [],
    }


def _text(tid: str, chars: str) -> dict:
    return {
        "id": tid,
        "type": "TEXT",
        "name": "Label",
        "characters": chars,
        "x": 0,
        "y": 0,
        "width": 10,
        "height": 10,
    }


def _envelope(children: list) -> dict:
    return {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "children": children,
                }
            ],
        }
    }


def test_prefers_largest_frame_inside_allowed_region():
    before = _envelope(
        [
            _frame("I10", "Region", 400, 400, [_frame("I11", "Existing", 200, 200, [])]),
            _frame("I20", "OtherScreen", 200, 200, [_text("I21", "outside")]),
        ]
    )
    after = _envelope(
        [
            _frame(
                "I10",
                "Region",
                400,
                400,
                [
                    _frame("I11", "Existing", 200, 200, []),
                    _frame(
                        "I30",
                        "NewScreen",
                        360,
                        800,
                        [
                            _frame("I31", "OtpCell", 48, 44, [_text("I32", "3")]),
                        ],
                    ),
                ],
            ),
            _frame("I20", "OtherScreen", 200, 200, [_text("I21", "changed")]),
        ]
    )
    graph = build_edit_graph(before, after)
    node_id = resolve_task_completeness_screenshot_node(
        after,
        before,
        graph,
        allowed_root_ids=["I10"],
    )
    assert node_id == "I30"


def test_uses_outside_region_when_no_inside_changes():
    before = _envelope([_frame("I10", "Region", 400, 400, [])])
    after = _envelope(
        [
            _frame("I10", "Region", 400, 400, []),
            _frame("I40", "OutsideScreen", 300, 600, []),
        ]
    )
    graph = build_edit_graph(before, after)
    node_id = resolve_task_completeness_screenshot_node(
        after,
        before,
        graph,
        allowed_root_ids=["I10"],
    )
    assert node_id == "I40"


def test_without_allowed_roots_picks_largest_overall():
    before = _envelope([_frame("I10", "Small", 50, 50, [])])
    after = _envelope(
        [
            _frame("I10", "Small", 50, 50, []),
            _frame("I20", "Large", 360, 800, []),
        ]
    )
    graph = build_edit_graph(before, after)
    node_id = resolve_task_completeness_screenshot_node(
        after,
        before,
        graph,
        allowed_root_ids=None,
    )
    assert node_id == "I20"


def test_oker_job_picks_full_screen_not_otp_cell():
    before_path = (
        _REPO_ROOT
        / "envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json"
    )
    after_path = (
        _REPO_ROOT
        / "jobs/2026-05-20__22-16-13/oker-create-max-otp-screen__4yDLgYc/artifacts/design.hfc.json"
    )
    if not before_path.is_file() or not after_path.is_file():
        return
    before = json.loads(before_path.read_text(encoding="utf-8"))
    after = json.loads(after_path.read_text(encoding="utf-8"))

    graph = build_edit_graph(before, after)
    node_id = resolve_task_completeness_screenshot_node(
        after,
        before,
        graph,
        allowed_root_ids=["I27"],
    )
    assert node_id == "I78855"
