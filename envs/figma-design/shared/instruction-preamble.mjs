import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const preamblePath = join(dirname(fileURLToPath(import.meta.url)), 'instruction-preamble.txt');

/** Standard agent constraint prepended to every task instruction.md. */
export const FIGMA_MCP_ONLY_PREAMBLE = readFileSync(preamblePath, 'utf8').trim();
