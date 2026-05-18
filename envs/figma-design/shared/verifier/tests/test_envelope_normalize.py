from __future__ import annotations

import json
from pathlib import Path

from figma_eval.edit_graph import build_edit_graph
from figma_eval.envelope_normalize import normalize_component_envelope


def _hybrid_fixture() -> dict:
    return {
        "schemaVersion": 1,
        "fileKey": "hybrid",
        "fileName": "hybrid",
        "nextInternalId": 100,
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "name": "Doc",
            "children": [
                {
                    "id": "I30",
                    "type": "PAGE",
                    "name": "Ready Pages",
                    "children": [
                        {
                            "id": "I31",
                            "type": "FRAME",
                            "name": "Homepage",
                            "children": [
                                {
                                    "id": "I32",
                                    "type": "COMPONENT",
                                    "name": "Footer",
                                    "rootFrameId": "I33",
                                }
                            ],
                        }
                    ],
                }
            ],
        },
        "components": [
            {
                "id": "I32",
                "name": "Footer",
                "root": {
                    "id": "I33",
                    "type": "FRAME",
                    "name": "FooterRoot",
                    "children": [],
                },
            }
        ],
    }


def test_normalize_removes_false_mass_adds_on_hybrid():
    before = normalize_component_envelope(_hybrid_fixture())
    after = normalize_component_envelope(json.loads(json.dumps(_hybrid_fixture())))
    after["document"]["children"][0]["children"][0]["children"].append(
        {"id": "I3157", "type": "TEXT", "name": "Terms", "characters": "Terms"}
    )

    graph = build_edit_graph(before, after)
    assert len(graph.added_ids) == 1
    assert "I3157" in graph.added_ids
    assert "I33" not in graph.added_ids
