from figma_eval.edit_graph import build_edit_graph, changed_node_ids
from figma_eval.tree import resolve_compare_with_reference_screenshot_node


def test_resolve_screenshot_picks_single_added_top_level_frame(load_fixture):
    before = load_fixture("minimal", "before")
    after = load_fixture("add-frame", "after")
    graph = build_edit_graph(before, after)
    changes = changed_node_ids(graph)

    node_id = resolve_compare_with_reference_screenshot_node(
        after,
        changes,
        added_ids=graph.added_ids,
        modified_ids=graph.modified_ids,
    )
    assert node_id == "I20"
