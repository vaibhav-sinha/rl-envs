import json
import os
import shlex
from typing import Any

from harbor.agents.installed.cursor_cli import CursorCli
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext


class CursorCliWithSkills(CursorCli):
    """Cursor CLI agent that registers Harbor task skills before each run."""

    async def install(self, environment: BaseEnvironment) -> None:
        # cursor-agent is pre-installed in the base image when built with --with-cursor-cli
        pass

    def _build_register_skills_command(self) -> str | None:
        """Copy skills from the environment into the project skills directory."""
        if not self.skills_dir:
            return None
        return (
            f"mkdir -p .cursor/skills && "
            f"(cp -r {shlex.quote(self.skills_dir)}/* .cursor/skills/ 2>/dev/null || true)"
        )

    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        skills_command = self._build_register_skills_command()
        if skills_command:
            env: dict[str, str] = {}
            if "CURSOR_API_KEY" in os.environ:
                env["CURSOR_API_KEY"] = os.environ["CURSOR_API_KEY"]
            await self.exec_as_agent(environment, command=skills_command, env=env)
        await super().run(instruction, environment, context)

    def _parse_stdout(self) -> list[dict[str, Any]]:
        """Parse cursor-cli JSONL; force UTF-8 (Windows locale defaults to cp1252)."""
        output_path = self.logs_dir / self._OUTPUT_FILENAME
        if not output_path.exists():
            return []

        events: list[dict[str, Any]] = []
        for line in output_path.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return events
