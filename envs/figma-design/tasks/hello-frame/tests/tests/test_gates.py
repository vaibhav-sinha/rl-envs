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
