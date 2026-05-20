import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const preamblePath = join(dirname(fileURLToPath(import.meta.url)), 'instruction-preamble.txt');

/** Standard agent constraint prepended to every task instruction.md. */
export const FIGMA_MCP_ONLY_PREAMBLE = readFileSync(preamblePath, 'utf8').trim();

/** Prepend the MCP-only constraint when missing. */
export function ensureFigmaMcpPreamble(content) {
  if (content.includes(FIGMA_MCP_ONLY_PREAMBLE)) {
    return content;
  }
  const trimmed = content.trimEnd();
  if (!trimmed) {
    return `${FIGMA_MCP_ONLY_PREAMBLE}\n`;
  }
  return `${FIGMA_MCP_ONLY_PREAMBLE}\n\n${trimmed}\n`;
}
