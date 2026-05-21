from figma_eval.edit_graph import EditGraph, NodeChange
from figma_eval.heuristics import run_heuristics


def _envelope_with_text(node_id: str, *, font_size: float, fg: dict, bg_parent_fill: dict) -> dict:
    return {
        "document": {
            "type": "DOCUMENT",
            "children": [
                {
                    "type": "PAGE",
                    "id": "P1",
                    "children": [
                        {
                            "type": "FRAME",
                            "id": "F1",
                            "fills": [bg_parent_fill],
                            "children": [
                                {
                                    "type": "TEXT",
                                    "id": node_id,
                                    "fontSize": font_size,
                                    "fills": [{"type": "SOLID", "color": fg}],
                                }
                            ],
                        }
                    ],
                }
            ],
        }
    }


def test_contrast_uses_min_ratio_not_mean():
    before = _envelope_with_text(
        "T1",
        font_size=14,
        fg={"r": 0.9, "g": 0.9, "b": 0.9},
        bg_parent_fill={"type": "SOLID", "color": {"r": 0.85, "g": 0.85, "b": 0.85}},
    )
    after = {
        "document": {
            "type": "DOCUMENT",
            "children": [
                {
                    "type": "PAGE",
                    "id": "P1",
                    "children": [
                        {
                            "type": "FRAME",
                            "id": "F1",
                            "fills": [
                                {"type": "SOLID", "color": {"r": 0.85, "g": 0.85, "b": 0.85}}
                            ],
                            "children": [
                                {
                                    "type": "TEXT",
                                    "id": "T1",
                                    "fontSize": 14,
                                    "fills": [{"type": "SOLID", "color": {"r": 0.9, "g": 0.9, "b": 0.9}}],
                                },
                                {
                                    "type": "TEXT",
                                    "id": "T2",
                                    "fontSize": 14,
                                    "fills": [{"type": "SOLID", "color": {"r": 0.1, "g": 0.1, "b": 0.1}}],
                                },
                            ],
                        }
                    ],
                }
            ],
        }
    }
    graph = EditGraph(
        equal=False,
        changes=[NodeChange(node_id="T2", operation="add")],
        added_ids={"T2"},
        deleted_ids=set(),
        modified_ids=set(),
    )
    results = run_heuristics(before, after, graph)
    contrast = next(r for r in results if r.id == "heuristics.contrast")
    assert contrast.applicable
    assert contrast.details is not None
    expected = min(1.0, contrast.details["min_contrast_ratio"] / 4.5)
    assert abs(contrast.score - expected) < 1e-9
