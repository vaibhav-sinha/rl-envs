from __future__ import annotations

import os
import subprocess
import traceback
from pathlib import Path

from .log import log


def default_hfc_cli() -> str:
    return os.environ.get("HFC_CLI", "/opt/hfc/dist/cli.js")


def render_timeout_sec() -> float:
    return float(os.environ.get("EVAL_RENDER_TIMEOUT_SEC", "90"))


def render_node(
    *,
    file: str | Path,
    node_id: str | None = None,
    figma_node_id: str | None = None,
    out: str | Path,
    hfc_cli: str | None = None,
    scale: float | None = None,
    background: str | None = None,
    padding: int | None = None,
) -> None:
    if (node_id is None) == (figma_node_id is None):
        raise ValueError("render_node requires exactly one of node_id or figma_node_id")
    cli = hfc_cli or default_hfc_cli()
    cmd = ["node", cli, "render", "--file", str(file), "--out", str(out)]
    if node_id is not None:
        cmd.extend(["--node", node_id])
    else:
        cmd.extend(["--figma-node", figma_node_id])
    if scale is not None:
        cmd.extend(["--scale", str(scale)])
    if background is not None:
        cmd.extend(["--background", background])
    if padding is not None:
        cmd.extend(["--padding", str(padding)])

    timeout = render_timeout_sec()
    node_ref = node_id if node_id is not None else figma_node_id
    log(f"hfc render start node={node_ref} out={out} timeout={timeout}s cmd={' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as e:
        stderr = (e.stderr or "").strip()
        stdout = (e.stdout or "").strip()
        msg = f"hfc render timed out after {timeout}s for node {node_ref}"
        if stderr or stdout:
            msg += f"\nstderr:\n{stderr}\nstdout:\n{stdout}"
        log(f"hfc render failed: {msg}")
        raise RuntimeError(msg) from e
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        msg = f"hfc render failed (exit {result.returncode}) for node {node_ref}"
        if stderr:
            msg += f"\nstderr:\n{stderr}"
        if stdout:
            msg += f"\nstdout:\n{stdout}"
        log(f"hfc render failed: {msg}")
        raise RuntimeError(msg)
    log(f"hfc render done node={node_ref} out={out}")


def render_node_or_error(
    *,
    file: str | Path,
    node_id: str | None = None,
    figma_node_id: str | None = None,
    out: str | Path,
    hfc_cli: str | None = None,
    scale: float | None = None,
    background: str | None = None,
    padding: int | None = None,
) -> str | None:
    """Render a node; return an error message instead of raising on failure."""
    try:
        render_node(
            file=file,
            node_id=node_id,
            figma_node_id=figma_node_id,
            out=out,
            hfc_cli=hfc_cli,
            scale=scale,
            background=background,
            padding=padding,
        )
    except Exception as exc:
        log(
            f"hfc render error node={node_id or figma_node_id} out={out}: {exc}\n"
            f"{traceback.format_exc()}"
        )
        return str(exc)
    return None
