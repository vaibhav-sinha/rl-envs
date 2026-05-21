"""Normalize HFC envelopes on verifier load."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from .types import Envelope, TreeNode


def _convert_component_instances(nodes: list[Any]) -> None:
    for i, node in enumerate(nodes):
        if isinstance(node, dict) and node.get("type") == "COMPONENT_INSTANCE":
            nodes[i] = {**node, "type": "INSTANCE"}
        if isinstance(node, dict) and isinstance(node.get("children"), list):
            _convert_component_instances(node["children"])


def normalize_envelope_on_load(env: Envelope) -> Envelope:
    """Apply load-time normalization (COMPONENT_INSTANCE → INSTANCE)."""
    out = deepcopy(env)
    document = out.get("document")
    if not document:
        return out
    for page in document.get("children") or []:
        _convert_component_instances(page.get("children") or [])
    return out
