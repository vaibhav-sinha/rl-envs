from __future__ import annotations

import os
import subprocess
from pathlib import Path


def default_hfc_cli() -> str:
    return os.environ.get("HFC_CLI", "/opt/hfc/dist/cli.js")


def render_node(
    *,
    file: str | Path,
    node_id: str,
    out: str | Path,
    hfc_cli: str | None = None,
    scale: float | None = None,
    background: str | None = None,
    padding: int | None = None,
) -> None:
    cli = hfc_cli or default_hfc_cli()
    cmd = ["node", cli, "render", "--file", str(file), "--node", node_id, "--out", str(out)]
    if scale is not None:
        cmd.extend(["--scale", str(scale)])
    if background is not None:
        cmd.extend(["--background", background])
    if padding is not None:
        cmd.extend(["--padding", str(padding)])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"hfc render failed ({result.returncode}): {result.stderr}\n{result.stdout}"
        )
