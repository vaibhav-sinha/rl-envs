from __future__ import annotations

from figma_eval.edit_graph import build_edit_graph
from figma_eval.screenshot import resolve_screenshot_target


def _frame(fid: str, name: str, w: int, h: int, *, x: int = 0, y: int = 0, children: list | None = None) -> dict:
    return {
        "id": fid,
        "type": "FRAME",
        "name": name,
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "children": children or [],
    }


def _section(sid: str, name: str, w: int, h: int, *, children: list | None = None) -> dict:
    return {
        "id": sid,
        "type": "SECTION",
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


def test_auto_step2_single_added_top_level():
    before = _envelope([])
    after = _envelope([_frame("I20", "Screen", 360, 800)])
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto"},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert target.node_ids == ["I20"]
    assert target.auto_step == 2
    assert target.composite is False


def test_auto_step2_targets_added_section():
    """Auto step 2 screenshots the SECTION the agent added, not an inner frame."""
    before = _envelope([])
    after = _envelope(
        [
            _section(
                "I20",
                "Orders",
                1200,
                1000,
                children=[_frame("I21", "Orders/OrderDetails", 360, 800)],
            )
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto"},
        spec={"id": "tc", "type": "task_completeness"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert target.node_ids == ["I20"]
    assert target.auto_step == 2


def test_auto_step4_composites_multiple_topmost_under_region():
    before = _envelope(
        [
            _frame(
                "I10",
                "Region",
                800,
                800,
                children=[_frame("I11", "Existing", 200, 200)],
            )
        ]
    )
    after = _envelope(
        [
            _frame(
                "I10",
                "Region",
                800,
                800,
                children=[
                    _frame("I11", "Existing", 200, 200),
                    _frame("I30", "Collection", 360, 800, x=0, y=0),
                    _frame("I31", "BottomSheet", 360, 800, x=400, y=0),
                ],
            )
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto"},
        spec={"id": "dc", "type": "design_consistency"},
        before=before,
        after=after,
        graph=graph,
        gates={"allowed_change_inside_ids": ["I10"]},
    )
    assert target is not None
    assert target.node_ids == ["I30", "I31"]
    assert target.auto_step == 4
    assert target.composite is True


def test_auto_step3_single_modified_top_level():
    before = _envelope([_frame("I20", "Screen", 360, 800)])
    after = _envelope([_frame("I20", "Screen", 370, 810)])
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto"},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert target.node_ids == ["I20"]
    assert target.auto_step == 3


def test_auto_step4_largest_added_inside_allowed_region():
    before = _envelope(
        [
            _frame("I10", "Region", 400, 400, children=[_frame("I11", "Existing", 200, 200, children=[])]),
            _frame("I20", "Other", 200, 200),
        ]
    )
    after = _envelope(
        [
            _frame(
                "I10",
                "Region",
                400,
                400,
                children=[
                    _frame("I11", "Existing", 200, 200, children=[]),
                    _frame("I30", "NewScreen", 360, 800),
                ],
            ),
            _frame("I20", "Other", 200, 200),
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto"},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates={"allowed_change_inside_ids": ["I10"]},
    )
    assert target is not None
    assert target.node_ids == ["I30"]
    assert target.auto_step == 4


def test_auto_step5_minimal_enclosing_for_siblings():
    before = _envelope(
        [
            _frame(
                "I10",
                "PageScreen",
                400,
                400,
                children=[_frame("I11", "Section", 300, 300, children=[])],
            ),
            _frame("I20", "OtherTop", 200, 200),
        ]
    )
    after = _envelope(
        [
            _frame(
                "I10",
                "PageScreen",
                400,
                400,
                children=[
                    _frame(
                        "I11",
                        "Section",
                        300,
                        300,
                        children=[
                            _frame("I30", "A", 100, 100, x=0, y=0),
                            _frame("I31", "B", 100, 100, x=120, y=0),
                        ],
                    )
                ],
            ),
            _frame("I20", "OtherTop", 200, 200),
        ]
    )
    after = _envelope(
        [
            _frame(
                "I10",
                "PageScreen",
                400,
                400,
                children=[
                    _frame(
                        "I11",
                        "Section",
                        300,
                        300,
                        children=[
                            _frame("I30", "A", 100, 100, x=0, y=0),
                            _frame("I31", "B", 100, 100, x=120, y=0),
                        ],
                    )
                ],
            ),
            _frame("I20", "OtherTop", 200, 200),
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto", "composite": False},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert target.node_ids == ["I11"]
    assert target.auto_step == 5
    assert target.composite is False


def test_auto_step5_composite_siblings():
    before = _envelope(
        [
            _frame(
                "I10",
                "PageScreen",
                400,
                400,
                children=[_frame("I11", "Section", 300, 300, children=[])],
            ),
            _frame("I20", "OtherTop", 200, 200),
        ]
    )
    after = _envelope(
        [
            _frame(
                "I10",
                "PageScreen",
                400,
                400,
                children=[
                    _frame(
                        "I11",
                        "Section",
                        300,
                        300,
                        children=[
                            _frame("I30", "A", 100, 100),
                            _frame("I31", "B", 100, 100),
                        ],
                    )
                ],
            ),
            _frame("I20", "OtherTop", 200, 200),
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto", "composite": True},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert set(target.node_ids) == {"I30", "I31"}
    assert target.auto_step == 5
    assert target.composite is True


def test_explicit_strategy_with_node_ids():
    before = _envelope([])
    after = _envelope(
        [
            _frame("I20", "A", 100, 100),
            _frame("I21", "B", 100, 100),
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "explicit", "node_ids": ["I20", "I21"]},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert target.node_ids == ["I20", "I21"]
    assert target.composite is True


def test_all_added_frames_topmost_dedup():
    before = _envelope([])
    after = _envelope(
        [
            _frame(
                "I10",
                "Section",
                400,
                800,
                children=[_frame("I30", "Screen", 360, 780)],
            ),
            _frame("I40", "Other", 200, 200),
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "all_added_frames"},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert set(target.node_ids) == {"I10", "I40"}
    assert target.composite is True


def test_largest_added_frame_top_level():
    before = _envelope([_frame("I10", "Old", 100, 100)])
    after = _envelope(
        [
            _frame("I10", "Old", 100, 100),
            _frame("I20", "Big", 360, 800),
            _frame("I21", "Small", 50, 50),
        ]
    )
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "largest_added_frame"},
        spec={"id": "gd", "type": "good_design"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert target.node_ids == ["I20"]


def test_per_check_node_id_override():
    before = _envelope([])
    after = _envelope([_frame("I20", "Screen", 360, 800)])
    graph = build_edit_graph(before, after)
    target = resolve_screenshot_target(
        screenshot_config={"strategy": "auto"},
        spec={"id": "tc", "type": "task_completeness", "node_id": "I20"},
        before=before,
        after=after,
        graph=graph,
        gates=None,
    )
    assert target is not None
    assert target.strategy == "explicit"
    assert target.node_ids == ["I20"]
