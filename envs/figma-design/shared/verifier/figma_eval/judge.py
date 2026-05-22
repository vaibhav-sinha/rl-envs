"""LiteLLM judge for figma-design visual and diff checks."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any, Callable

from .log import log

ScoreMap = dict[str, float]


def llm_timeout_sec() -> float:
    return float(os.environ.get("EVAL_LLM_TIMEOUT_SEC", "120"))


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


def _parse_explanations(
    data: dict[str, Any],
    *,
    explanations_key: str | None,
    keys: list[str],
) -> dict[str, str]:
    if not explanations_key:
        return {}
    raw = data.get(explanations_key) or {}
    if not isinstance(raw, dict):
        return {}
    explanations: dict[str, str] = {}
    for key in keys:
        if key in raw and raw[key] is not None:
            explanations[key] = str(raw[key]).strip()
    return explanations


def parse_criteria_scores(
    text: str,
    *,
    consistency_keys: list[str],
    fit_keys: list[str] | None = None,
    scores_key: str = "consistency_scores",
    explanations_key: str | None = None,
) -> dict[str, Any]:
    data = json.loads(_strip_json_fence(text))
    consistency_raw = (
        data.get(scores_key)
        or data.get("consistency_scores")
        or data.get("scores")
        or data.get("dimensions")
        or {}
    )
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

    all_keys = list(consistency_keys) + list(fit_keys or [])
    explanations = _parse_explanations(
        data,
        explanations_key=explanations_key,
        keys=all_keys,
    )

    all_scores = list(consistency.values()) + list(fit.values())
    result: dict[str, Any] = {
        "consistency_scores": consistency,
        "fit_scores": fit,
        "mean_score": mean_normalized(all_scores),
    }
    if explanations:
        result["explanations"] = explanations
    return result


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

    timeout = llm_timeout_sec()
    log(f"LLM request model={model} timeout={timeout}s")
    response = litellm.completion(
        model=model,
        messages=messages,
        num_retries=0,
        temperature=0,
        timeout=timeout,
        request_timeout=timeout,
    )
    text = response.choices[0].message.content or ""
    log(f"LLM response received ({len(text)} chars)")
    return text


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
        "model": model or os.environ.get("EVAL_JUDGE_MODEL", "gemini/gemini-3-flash-preview"),
        "prompt": prompt,
        "images": payload_images,
    }
    retries = num_retries if num_retries is not None else int(os.environ.get("EVAL_JUDGE_RETRIES", "1"))
    image_count = len(payload_images)
    log(f"LLM judge start model={payload['model']} images={image_count} retries={retries}")

    messages = _build_messages(payload)
    last_err: Exception | None = None

    for attempt in range(retries + 1):
        try:
            if attempt > 0:
                log(f"LLM judge retry {attempt}/{retries}")
            text = _call_litellm(payload["model"], messages)
            parsed = parse_fn(text)
            log(f"LLM judge parsed mean_score={parsed.get('mean_score')}")
            return parsed
        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            last_err = e
            log(f"LLM judge parse error: {e}")
            messages = [
                {
                    "role": "user",
                    "content": retry_hint + "\n\n" + prompt,
                }
            ]
        except Exception as e:
            last_err = e
            log(f"LLM judge error: {type(e).__name__}: {e}")
            break

    if last_err:
        log(f"LLM judge failed after {retries + 1} attempt(s): {last_err}")
    return {"mean_score": 0.0, "error": str(last_err) if last_err else "unknown"}


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
