from figma_eval.edit_graph import build_edit_graph
from figma_eval.gates import run_gates


def test_require_change_fails_on_identical(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"require_change": True})
    rc = next(r for r in results if r.id == "gates.require_change")
    assert rc.score == 0.0


def test_preserve_ids_passes(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"preserve_ids": ["I3"]})
    p = next(r for r in results if r.id == "gates.preserve.I3")
    assert p.score == 1.0


def test_allowed_change_inside_passes_when_change_inside(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"allowed_change_inside_ids": ["I2"]})
    gate = next(r for r in results if r.id == "gates.allowed_change_inside")
    assert gate.score == 1.0


def test_allowed_change_inside_fails_on_outside_change(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"allowed_change_inside_ids": ["I3"]})
    gate = next(r for r in results if r.id == "gates.allowed_change_inside")
    assert gate.score == 0.0


def test_additions_only_passes_on_add_only(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"additions_only": True})
    gate = next(r for r in results if r.id == "gates.additions_only")
    assert gate.score == 1.0


def test_additions_only_fails_on_edit(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("rename-board", "after")
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"additions_only": True})
    gate = next(r for r in results if r.id == "gates.additions_only")
    assert gate.score == 0.0


def test_allowed_change_inside_fails_reparent_into_region():
    before = {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "children": [
                        {"id": "I3", "type": "FRAME", "children": []},
                        {
                            "id": "I4",
                            "type": "TEXT",
                            "name": "Outside",
                            "characters": "A",
                        },
                    ],
                }
            ],
        }
    }
    after = {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "children": [
                        {
                            "id": "I3",
                            "type": "FRAME",
                            "children": [
                                {
                                    "id": "I4",
                                    "type": "TEXT",
                                    "name": "MovedIn",
                                    "characters": "A",
                                }
                            ],
                        }
                    ],
                }
            ],
        }
    }
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"allowed_change_inside_ids": ["I3"]})
    gate = next(r for r in results if r.id == "gates.allowed_change_inside")
    assert gate.score == 0.0


def test_allowed_change_inside_fails_reparent_out_of_region():
    before = {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "children": [
                        {
                            "id": "I3",
                            "type": "FRAME",
                            "children": [
                                {
                                    "id": "I4",
                                    "type": "TEXT",
                                    "name": "Inside",
                                    "characters": "A",
                                }
                            ],
                        }
                    ],
                }
            ],
        }
    }
    after = {
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "children": [
                        {"id": "I3", "type": "FRAME", "children": []},
                        {
                            "id": "I4",
                            "type": "TEXT",
                            "name": "Outside",
                            "characters": "A",
                        },
                    ],
                }
            ],
        }
    }
    graph = build_edit_graph(before, after)
    results = run_gates(before, after, graph, {"allowed_change_inside_ids": ["I3"]})
    gate = next(r for r in results if r.id == "gates.allowed_change_inside")
    assert gate.score == 0.0
