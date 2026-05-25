from figma_eval.edit_graph import (
    build_edit_graph,
    format_diff_summary,
    format_resource_diff_summary,
)


def _envelope_with_paint_styles(paint_styles: list[dict]) -> dict:
    return {
        "schemaVersion": 1,
        "document": {
            "id": "I1",
            "type": "DOCUMENT",
            "name": "Document",
            "children": [
                {
                    "id": "I2",
                    "type": "PAGE",
                    "name": "Page",
                    "children": [
                        {
                            "id": "I3",
                            "type": "FRAME",
                            "name": "Frame",
                            "x": 0,
                            "y": 0,
                            "width": 100,
                            "height": 100,
                            "children": [],
                        }
                    ],
                }
            ],
        },
        "paintStyles": paint_styles,
    }


def test_format_resource_diff_summary_lists_added_paint_styles():
    before = _envelope_with_paint_styles(
        [{"id": "PS1", "name": "Legacy/White", "paints": [{"type": "SOLID"}]}]
    )
    after = _envelope_with_paint_styles(
        [
            {"id": "PS1", "name": "Legacy/White", "paints": [{"type": "SOLID"}]},
            {
                "id": "PS2",
                "name": "PDP/Surface/White",
                "paints": [
                    {
                        "type": "VARIABLE_COLOR",
                        "variableId": "VV1",
                    }
                ],
            },
        ]
    )
    after["variableCollections"] = [
        {
            "id": "VC1",
            "name": "Colors",
            "variables": [{"id": "VV1", "name": "surface/white", "resolvedType": "COLOR"}],
        }
    ]

    summary = format_resource_diff_summary(before, after)

    assert "paintStyles:" in summary
    assert "added (1):" in summary
    assert 'PS2 "PDP/Surface/White"' in summary
    assert "VAR(surface/white)" in summary
    assert "resources: no style or variable changes" not in summary


def test_format_resource_diff_summary_no_changes():
    styles = [{"id": "PS1", "name": "A", "paints": [{"type": "SOLID"}]}]
    envelope = _envelope_with_paint_styles(styles)
    assert format_resource_diff_summary(envelope, envelope) == (
        "resources: no style or variable changes"
    )


def test_format_diff_summary_includes_resources_section():
    before = _envelope_with_paint_styles([])
    after = _envelope_with_paint_styles(
        [{"id": "PS9", "name": "PDP/CTA", "paints": [{"type": "SOLID"}]}]
    )
    graph = build_edit_graph(before, after)
    summary = format_diff_summary(graph, before=before, after=after)

    assert "## Resources (styles & variables)" in summary
    assert 'PS9 "PDP/CTA"' in summary
    assert "changes:" in summary
