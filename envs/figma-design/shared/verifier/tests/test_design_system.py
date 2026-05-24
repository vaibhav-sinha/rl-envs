from __future__ import annotations

from typing import Any

from figma_eval.catalog import build_catalog
from figma_eval.design_system import run_design_system_checks
from figma_eval.edit_graph import build_edit_graph


def _all_novelty_enabled() -> dict[str, Any]:
    return {
        "allow_novelty": {
            "text": {
                "color": True,
                "font_size": True,
                "font_family": True,
                "font_weight": True,
            },
            "frames": {
                "fill": True,
                "background": True,
                "stroke_color": True,
                "stroke_width": True,
                "corner_radius": True,
                "effects": True,
                "item_spacing": True,
                "counter_axis_spacing": True,
                "padding": True,
                "layout_grid": True,
            },
        }
    }


def _novelty_background_only() -> dict[str, Any]:
    cfg = _all_novelty_enabled()
    for key in cfg["allow_novelty"]["text"]:
        cfg["allow_novelty"]["text"][key] = False
    for key in cfg["allow_novelty"]["frames"]:
        cfg["allow_novelty"]["frames"][key] = key == "background"
    return cfg


def _novelty_text_color_only() -> dict[str, Any]:
    cfg = _all_novelty_enabled()
    for key in cfg["allow_novelty"]["text"]:
        cfg["allow_novelty"]["text"][key] = key == "color"
    for key in cfg["allow_novelty"]["frames"]:
        cfg["allow_novelty"]["frames"][key] = False
    return cfg


def _run(before: dict, after: dict, ds_spec: dict | None = None):
    graph = build_edit_graph(before, after)
    catalog = build_catalog(before)
    return {
        r.id: r
        for r in run_design_system_checks(before, after, graph, catalog, ds_spec)
    }


def test_token_adherence_rejects_wrong_role_color(load_fixture):
    before = load_fixture("role-adherence", "before")
    after = load_fixture("role-adherence", "after")
    results = _run(before, after)
    check = results["design_system.token_adherence"]
    assert check.applicable
    assert check.score < 1.0
    assert check.details["violations"] >= 1


def test_token_adherence_skipped_when_all_novelty_enabled(load_fixture):
    before = load_fixture("role-adherence", "before")
    after = load_fixture("role-adherence", "after")
    results = _run(before, after, _all_novelty_enabled())
    check = results["design_system.token_adherence"]
    assert not check.applicable
    assert check.score == 1.0
    assert check.details["reason"] == "all_roles_novelty_allowed"


def test_token_adherence_partial_text_color_novelty(load_fixture):
    before = load_fixture("role-adherence", "before")
    after = load_fixture("role-adherence", "after")
    results = _run(before, after, _novelty_text_color_only())
    check = results["design_system.token_adherence"]
    assert check.score == 1.0
    assert "text_color" not in check.details.get("violations_by_role", {})
    assert "text_color" in check.details.get("allowed_roles", [])


def test_token_adherence_partial_background_still_enforces_text(load_fixture):
    before = load_fixture("role-adherence", "before")
    after = load_fixture("role-adherence", "after")
    results = _run(before, after, _novelty_background_only())
    check = results["design_system.token_adherence"]
    assert check.applicable
    assert check.score < 1.0
    assert "text_color" in check.details.get("violations_by_role", {})


def test_token_adherence_layout_spacing(load_fixture):
    before = load_fixture("layout-adherence", "before")
    after = load_fixture("layout-adherence", "after")
    results = _run(before, after)
    check = results["design_system.token_adherence"]
    assert check.applicable
    assert check.score < 1.0
    assert "layout_item_spacing" in check.details.get("violations_by_role", {})


def test_style_variable_reuse_penalizes_raw_matching_style(load_fixture):
    before = load_fixture("style-reuse", "before")
    after = load_fixture("style-reuse", "after")
    results = _run(before, after)
    check = results["design_system.style_variable_reuse"]
    assert check.applicable
    assert check.score < 1.0
    assert check.details["missed_bindings"] >= 1


def test_style_variable_reuse_penalizes_raw_matching_variable(load_fixture):
    before = load_fixture("layout-variable", "before")
    after = load_fixture("layout-variable", "after")
    results = _run(before, after)
    check = results["design_system.style_variable_reuse"]
    assert check.applicable
    assert check.score < 1.0


def test_edited_regression_detects_lost_binding(load_fixture):
    before = load_fixture("edited-regression", "before")
    after = load_fixture("edited-regression", "after")
    results = _run(before, after)
    check = results["design_system.edited_regression"]
    assert check.applicable
    assert check.score < 1.0
    assert check.details["regressions"] == 1


def test_no_legacy_subcheck_ids(load_fixture):
    before = load_fixture("role-adherence", "before")
    after = load_fixture("role-adherence", "after")
    results = _run(before, after)
    assert "design_system.novelty" not in results
    assert "design_system.clone_cheat" not in results
    assert "design_system.style_reuse" not in results
