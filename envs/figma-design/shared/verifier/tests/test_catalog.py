from figma_eval.catalog import build_catalog, component_exists
from figma_eval.tree import clear_node_ref_index_cache, collect_component_ids


def test_build_catalog_collects_graph_component_ids():
    clear_node_ref_index_cache()
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
                            "id": "C1",
                            "type": "COMPONENT",
                            "name": "Primary",
                            "children": [],
                        },
                        {
                            "id": "S1",
                            "type": "COMPONENT_SET",
                            "name": "Variants",
                            "children": [],
                        },
                    ],
                }
            ],
        }
    }
    assert collect_component_ids(envelope) == {"C1", "S1"}
    catalog = build_catalog(envelope)
    assert catalog.component_ids == {"C1", "S1"}
    assert catalog.has_components is True
    assert component_exists(catalog, envelope, "C1") is True
