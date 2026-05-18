"""LiteLLM visual judge for figma-design eval."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any

DIMENSIONS = [
    "spacing",
    "typography",
    "color",
    "pattern",
    "alignment",
    "hierarchy",
]


def _build_messages(payload: dict[str, Any]) -> list[dict[str, Any]]:
    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                f"{payload['prompt']}\n\n"
                "Score each dimension 1-5 (1=poor, 5=excellent). "
                "Respond with JSON only: "
                '{"dimensions": {"spacing": N, ...}, "mean_score": 0.0}'
                " where mean_score is 0-1 normalized average."
            ),
        }
    ]
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


def parse_response(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    data = json.loads(text)
    dims = data.get("dimensions", {})
    scores = []
    for d in DIMENSIONS:
        if d in dims:
            v = float(dims[d])
            scores.append(max(0.0, min(1.0, (v - 1) / 4)))
    mean = data.get("mean_score")
    if mean is None and scores:
        mean = sum(scores) / len(scores)
    return {
        "dimensions": dims,
        "mean_score": float(mean) if mean is not None else 0.5,
    }


def _call_litellm(model: str, messages: list[dict[str, Any]]) -> str:
    import litellm

    response = litellm.completion(
        model=model,
        messages=messages,
        num_retries=0,
        temperature=0,
    )
    return response.choices[0].message.content or ""


def run_visual_judge(
    *,
    prompt: str,
    images: list[dict[str, str]],
    model: str | None = None,
    num_retries: int | None = None,
) -> dict[str, Any]:
    """Score visual check images. Each image entry has ``role`` and ``path``."""
    payload_images = []
    for img in images:
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
            return parse_response(text)
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            last_err = e
            messages = [
                {
                    "role": "user",
                    "content": (
                        "Return ONLY valid JSON with keys dimensions (object) and mean_score (0-1 float). "
                        "No markdown.\n\n"
                        + prompt
                    ),
                }
            ]

    if last_err:
        raise last_err
    return {"mean_score": 0.0, "dimensions": {}}
