import os
import shlex

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
