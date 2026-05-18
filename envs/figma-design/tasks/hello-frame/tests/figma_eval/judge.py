"""LiteLLM judge for figma-design visual and diff checks."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any, Callable

ScoreMap = dict[str, float]


def _strip_json_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return text.strip()


def _normalize_1_to_5(value: float) -> float:
    return max(0.0, min(1.0, (float(value) - 1) / 4))


def _normalize_0_to_10(value: float) -> float:
    return max(0.0, min(1.0, float(value) / 10))


def mean_normalized(scores: list[float]) -> float:
    if not scores:
        return 0.0
    return sum(scores) / len(scores)


def parse_criteria_scores(
    text: str,
    *,
    consistency_keys: list[str],
    fit_keys: list[str] | None = None,
) -> dict[str, Any]:
    data = json.loads(_strip_json_fence(text))
    consistency_raw = data.get("consistency_scores") or data.get("dimensions") or {}
    fit_raw = data.get("fit_scores") or {}

    consistency: ScoreMap = {}
    for key in consistency_keys:
        if key in consistency_raw:
            consistency[key] = _normalize_1_to_5(consistency_raw[key])

    fit: ScoreMap = {}
    if fit_keys:
        for key in fit_keys:
            if key in fit_raw:
                fit[key] = _normalize_1_to_5(fit_raw[key])

    all_scores = list(consistency.values()) + list(fit.values())
    return {
        "consistency_scores": consistency,
        "fit_scores": fit,
        "mean_score": mean_normalized(all_scores),
    }


def parse_task_completeness(text: str) -> dict[str, Any]:
    data = json.loads(_strip_json_fence(text))
    completed = bool(data.get("completed", False))
    return {
        "completed": completed,
        "requirements": data.get("requirements", []),
        "mean_score": 1.0 if completed else 0.0,
    }


def parse_preference_score(text: str) -> dict[str, Any]:
    """Parse 0-10 preference score (0=reference preferred, 10=agent preferred)."""
    data = json.loads(_strip_json_fence(text))
    raw = data.get("preference_score", data.get("score", 0))
    score = max(0.0, min(10.0, float(raw)))
    return {"preference_score": score, "mean_score": _normalize_0_to_10(score)}


def parse_numeric_score(text: str, *, scale: int = 10) -> dict[str, Any]:
    data = json.loads(_strip_json_fence(text))
    raw = data.get("score", data.get("mean_score", 0))
    score = float(raw)
    normalize = _normalize_0_to_10 if scale == 10 else lambda v: max(0.0, min(1.0, v))
    return {"score": score, "mean_score": normalize(score)}


def parse_response(text: str) -> dict[str, Any]:
    """Backward-compatible parser for legacy dimension payloads."""
    return parse_criteria_scores(
        text,
        consistency_keys=[
            "spacing",
            "typography",
            "color",
            "pattern",
            "alignment",
            "hierarchy",
        ],
    )


def _build_messages(payload: dict[str, Any]) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = [{"type": "text", "text": payload["prompt"]}]
    for img in payload.get("images", []):
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{img.get('mime_type', 'image/png')};base64,{img['data']}",
                },
            }
        )
        content.append({"type": "text", "text": f"Image role: {img.get('role', 'unknown')}"})
    return [{"role": "user", "content": content}]


def _call_litellm(model: str, messages: list[dict[str, Any]]) -> str:
    import litellm

    response = litellm.completion(
        model=model,
        messages=messages,
        num_retries=0,
        temperature=0,
    )
    return response.choices[0].message.content or ""


def run_llm_judge(
    *,
    prompt: str,
    images: list[dict[str, str]] | None = None,
    model: str | None = None,
    num_retries: int | None = None,
    parse_fn: Callable[[str], dict[str, Any]],
    retry_hint: str,
) -> dict[str, Any]:
    payload_images = []
    for img in images or []:
        data = base64.b64encode(Path(img["path"]).read_bytes()).decode("ascii")
        payload_images.append(
            {"role": img["role"], "data": data, "mime_type": "image/png"}
        )

    payload: dict[str, Any] = {
        "model": model or os.environ.get("EVAL_JUDGE_MODEL", "anthropic/claude-sonnet-4-6"),
        "prompt": prompt,
        "images": payload_images,
    }
    retries = num_retries if num_retries is not None else int(os.environ.get("EVAL_JUDGE_RETRIES", "1"))

    messages = _build_messages(payload)
    last_err: Exception | None = None

    for _attempt in range(retries + 1):
        try:
            text = _call_litellm(payload["model"], messages)
            return parse_fn(text)
        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            last_err = e
            messages = [
                {
                    "role": "user",
                    "content": retry_hint + "\n\n" + prompt,
                }
            ]

    if last_err:
        raise last_err
    return {"mean_score": 0.0}


def run_visual_judge(
    *,
    prompt: str,
    images: list[dict[str, str]],
    model: str | None = None,
    num_retries: int | None = None,
) -> dict[str, Any]:
    """Score visual check images. Each image entry has ``role`` and ``path``."""
    return run_llm_judge(
        prompt=prompt,
        images=images,
        model=model,
        num_retries=num_retries,
        parse_fn=parse_response,
        retry_hint="Return ONLY valid JSON. No markdown.",
    )
