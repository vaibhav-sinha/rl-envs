import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { FileEnvelope, FrameNode } from '../../src/model/types.js';
import { envelopeAfterScriptRun } from '../helpers/commitScriptRun.js';

function findFrame(env: FileEnvelope, name: string): FrameNode | null {
  function walk(nodes: FrameNode['children']): FrameNode | null {
    for (const n of nodes) {
      if (n.type === 'FRAME' && n.name === name) return n as FrameNode;
      if ('children' in n && Array.isArray(n.children)) {
        const hit = walk(n.children as FrameNode['children']);
        if (hit) return hit;
      }
    }
    return null;
  }
  for (const p of env.document.children) {
    const hit = walk(p.children);
    if (hit) return hit;
  }
  return null;
}

describe('layoutSizingAxisSync — use_figma script', () => {
  it('layoutSizingVertical HUG on horizontal frame sets counterAxisSizingMode AUTO', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'hug-sync' });

    const code = `
const row = figma.createFrame();
row.name = 'Row';
row.layoutMode = 'HORIZONTAL';
row.resize(200, 100);
const t = figma.createText();
t.characters = 'Hi';
t.fontSize = 14;
t.fontName = { family: 'Inter', style: 'Regular' };
row.appendChild(t);
row.layoutSizingVertical = 'HUG';
figma.currentPage.appendChild(row);
return { id: row.id, counter: row.counterAxisSizingMode };
`.trim();

    const run = await runUseFigmaScript(code, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const env = envelopeAfterScriptRun(engine, run) as FileEnvelope;
    const row = findFrame(env, 'Row');
    expect(row).not.toBeNull();
    expect(row!.counterAxisSizingMode).toBe('AUTO');
    expect(row!.layoutSizingVertical).toBe('HUG');
  });
});
