from figma_eval.catalog import build_catalog
from figma_eval.checks.handlers import run_spec_check
from figma_eval.edit_graph import build_edit_graph


def test_must_contain_text_node_id(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {
            "id": "x",
            "type": "must_contain_text",
            "scope": "node_id",
            "node_id": "I3",
            "contains": "Hi",
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0


def test_must_contain_text_new_frames(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("hello-text", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {
            "id": "x",
            "type": "must_contain_text",
            "scope": "new_frames",
            "contains": "Hello",
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0
    assert "I21" in r.details["matched_node_ids"]


def test_must_contain_text_inside_instance_children(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("text-in-instance", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {
            "id": "x",
            "type": "must_contain_text",
            "scope": "new_frames",
            "contains": "category",
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0
    assert "I23" in r.details["matched_node_ids"]


def test_must_contain_image_any(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("with-image", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {
            "id": "x",
            "type": "must_contain_image",
            "scope": "node_id",
            "node_id": "I3",
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0


def test_must_contain_image_hash(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("with-image", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {
            "id": "x",
            "type": "must_contain_image",
            "scope": "node_id",
            "node_id": "I3",
            "image_hash": "hero-hash-abc",
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0

    r_wrong = run_spec_check(
        {
            "id": "y",
            "type": "must_contain_image",
            "scope": "node_id",
            "node_id": "I3",
            "image_hash": "wrong-hash",
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r_wrong.score == 0.0


def test_min_added_under(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {"id": "x", "type": "min_added_under", "parent_id": "I2", "min": 1},
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0


def test_min_added_under_partial(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {"id": "x", "type": "min_added_under", "parent_id": "I2", "min": 2},
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 0.5


def test_component_instances_under(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("with-instance", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {
            "id": "x",
            "type": "component_instances_under",
            "scope_id": "I3",
            "component_id": "COMP1",
            "min_instances": 2,
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0


def test_metadata_only_under(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("rename-board", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {"id": "x", "type": "metadata_only_under", "parent_id": "I2"},
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0


def test_property_on_node(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("minimal", "after")
    graph = build_edit_graph(before, after)
    r = run_spec_check(
        {
            "id": "x",
            "type": "property_on_node",
            "node_id": "I3",
            "property": "name",
            "equals": "Board",
        },
        before,
        after,
        graph,
        build_catalog(before),
    )
    assert r.score == 1.0
