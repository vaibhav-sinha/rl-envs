from __future__ import annotations

from datetime import datetime, timezone


def log(message: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[figma_eval {ts}] {message}", flush=True)
