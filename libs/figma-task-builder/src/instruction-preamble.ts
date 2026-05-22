import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const preamblePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../envs/figma-design/shared/instruction-preamble.txt'
);

/** Standard agent constraint prepended to every task instruction.md. */
export const FIGMA_MCP_ONLY_PREAMBLE = readFileSync(preamblePath, 'utf8').trim();

export function defaultInstructionBody(taskId: string): string {
  return `# ${taskId}

## Goal

<!-- Describe the design change the agent should make. -->
`;
}

export function buildDefaultInstruction(taskId: string): string {
  return `${FIGMA_MCP_ONLY_PREAMBLE}\n\n${defaultInstructionBody(taskId)}`;
}
