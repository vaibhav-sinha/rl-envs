"""Shared helpers for parsing Harbor ATIF trajectory JSON."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator


@dataclass
class ToolCallSummary:
    tool_call_id: str
    function_name: str
    provider: str | None = None
    tool_name: str | None = None
    code: str | None = None


@dataclass
class ObservationIssue:
    step_id: int
    source_call_id: str
    kind: str
    detail: Any


@dataclass
class StepSummary:
    step_id: int
    source: str
    timestamp: str | None
    message: str
    tool_calls: list[ToolCallSummary] = field(default_factory=list)
    issues: list[ObservationIssue] = field(default_factory=list)


def load_trajectory(path: str | Path) -> dict[str, Any]:
    p = Path(path)
    with p.open(encoding="utf-8") as f:
        return json.load(f)


def parse_observation_content(content: str | None) -> Any | None:
    """Unwrap Cursor MCP observation content to parsed JSON when possible."""
    if not content:
        return None
    try:
        outer = json.loads(content)
    except json.JSONDecodeError:
        return {"raw": content[:500]}

    if not isinstance(outer, dict):
        return outer

    if "success" in outer:
        inner = outer["success"]
        if isinstance(inner, dict) and "content" in inner:
            for item in inner.get("content", []):
                if not isinstance(item, dict):
                    continue
                text = item.get("text")
                if isinstance(text, dict) and "text" in text:
                    try:
                        return json.loads(text["text"])
                    except json.JSONDecodeError:
                        return text
                if "image" in item:
                    return {"_image": True, "keys": list(item["image"].keys())}
        return inner

    return outer


def iter_steps(data: dict[str, Any]) -> Iterator[dict[str, Any]]:
    for step in data.get("steps", []):
        if isinstance(step, dict):
            yield step


def summarize_tool_call(tc: dict[str, Any]) -> ToolCallSummary:
    args = tc.get("arguments") or {}
    inner = args.get("args") if isinstance(args.get("args"), dict) else {}
    code = inner.get("code") if isinstance(inner, dict) else None
    name = args.get("name") or tc.get("function_name") or ""
    provider = args.get("providerIdentifier")
    tool_name = args.get("toolName")
    m = re.match(r"^([^-]+)-(.+)$", str(name))
    if m and not provider:
        provider, tool_name = m.group(1), m.group(2)
    return ToolCallSummary(
        tool_call_id=str(tc.get("tool_call_id", "")),
        function_name=str(tc.get("function_name", "")),
        provider=provider,
        tool_name=tool_name,
        code=code,
    )


def collect_observation_issues(step: dict[str, Any]) -> list[ObservationIssue]:
    sid = int(step.get("step_id", -1))
    issues: list[ObservationIssue] = []
    obs = step.get("observation") or {}
    for res in obs.get("results", []) or []:
        cid = str(res.get("source_call_id", ""))
        parsed = parse_observation_content(res.get("content"))
        if not isinstance(parsed, dict):
            continue
        if parsed.get("ok") is False:
            issues.append(
                ObservationIssue(sid, cid, "api_error", parsed)
            )
        if parsed.get("isError"):
            issues.append(ObservationIssue(sid, cid, "isError", parsed))
        data = parsed.get("data")
        if isinstance(data, dict):
            if data.get("error"):
                issues.append(
                    ObservationIssue(sid, cid, "data.error", data["error"])
                )
            warnings = data.get("warnings") or []
            if warnings:
                issues.append(
                    ObservationIssue(sid, cid, "warnings", warnings)
                )
    return issues


def summarize_step(step: dict[str, Any]) -> StepSummary:
    return StepSummary(
        step_id=int(step.get("step_id", -1)),
        source=str(step.get("source", "")),
        timestamp=step.get("timestamp"),
        message=str(step.get("message") or ""),
        tool_calls=[
            summarize_tool_call(tc)
            for tc in (step.get("tool_calls") or [])
            if isinstance(tc, dict)
        ],
        issues=collect_observation_issues(step),
    )


def summarize_trajectory(data: dict[str, Any]) -> list[StepSummary]:
    return [summarize_step(s) for s in iter_steps(data)]


def find_use_figma_results(
    data: dict[str, Any], step_id: int | None = None
) -> list[tuple[int, str, Any]]:
    """Return (step_id, call_id, parsed_result) for Figma use_figma calls."""
    out: list[tuple[int, str, Any]] = []
    for step in iter_steps(data):
        sid = int(step.get("step_id", -1))
        if step_id is not None and sid != step_id:
            continue
        obs_by_id = {
            str(r.get("source_call_id")): parse_observation_content(r.get("content"))
            for r in (step.get("observation") or {}).get("results", [])
            or []
        }
        for tc in step.get("tool_calls") or []:
            if not isinstance(tc, dict):
                continue
            summ = summarize_tool_call(tc)
            if summ.tool_name != "use_figma" and "use_figma" not in (summ.tool_name or ""):
                continue
            parsed = obs_by_id.get(summ.tool_call_id)
            if isinstance(parsed, dict) and parsed.get("ok") is True:
                result = (parsed.get("data") or {}).get("result")
                out.append((sid, summ.tool_call_id, result))
            elif isinstance(parsed, dict) and parsed.get("ok") is False:
                out.append((sid, summ.tool_call_id, parsed))
    return out
