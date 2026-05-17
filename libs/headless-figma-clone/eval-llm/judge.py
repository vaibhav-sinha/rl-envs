#!/usr/bin/env python3
"""LiteLLM visual judge for HFC eval. Reads JSON stdin, writes JSON stdout."""

from __future__ import annotations

import json
import os
import sys
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


def _parse_response(text: str) -> dict[str, Any]:
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


def _call_litellm(model: str, messages: list[dict[str, Any]], num_retries: int) -> str:
    import litellm

    response = litellm.completion(
        model=model,
        messages=messages,
        num_retries=num_retries,
        temperature=0,
    )
    return response.choices[0].message.content or ""


def main() -> None:
    raw = sys.stdin.read()
    payload = json.loads(raw)
    model = payload.get("model") or os.environ.get("EVAL_JUDGE_MODEL", "anthropic/claude-sonnet-4-6")
    num_retries = int(os.environ.get("EVAL_JUDGE_RETRIES", "1"))

    messages = _build_messages(payload)
    last_err: Exception | None = None

    for attempt in range(num_retries + 1):
        try:
            text = _call_litellm(model, messages, num_retries=0)
            result = _parse_response(text)
            json.dump(result, sys.stdout)
            return
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            last_err = e
            messages = [
                {
                    "role": "user",
                    "content": (
                        "Return ONLY valid JSON with keys dimensions (object) and mean_score (0-1 float). "
                        "No markdown.\n\n"
                        + str(payload.get("prompt", ""))
                    ),
                }
            ]

    if last_err:
        raise last_err
    json.dump({"mean_score": 0.0, "dimensions": {}}, sys.stdout)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e), "mean_score": 0.0}), file=sys.stdout)
        sys.exit(1)
