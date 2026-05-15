import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { applyAutoLayoutIntrinsicSizingDeep } from '../../src/render/autoLayoutIntrinsicSizing.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { FileEnvelope, FrameNode } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function firstAutoLayoutFrame(env: FileEnvelope): FrameNode | null {
  function walk(nodes: import('../../src/model/types.js').SceneNode[]): FrameNode | null {
    for (const n of nodes) {
      if (n.type === 'FRAME') {
        const f = n as FrameNode;
        if (f.layoutMode === 'HORIZONTAL' || f.layoutMode === 'VERTICAL') return f;
        const inner = walk(f.children);
        if (inner) return inner;
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

describe('scenario 60 empty autolayout min', () => {
  it('matches Figma empty hug: square axis and default frame minimum (~100)', async () => {
    const script = readFileSync(join(__dirname, '../../verification/scenarios/60-empty-autolayout-min/script.js'), 'utf8');
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: '60' });
    const run = await runUseFigmaScript(script, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const env = structuredClone(engine.getActiveFile()!) as FileEnvelope;
    for (const op of run.operations) applyEngineOp(env, op);
    const rootId = (run.result as { rootId: string }).rootId;
    const root = env.document.children[0]!.children.find((c) => c.id === rootId)! as FrameNode;

    applyAutoLayoutIntrinsicSizingDeep(root);

    const row = firstAutoLayoutFrame(env);
    expect(row).toBeTruthy();
    expect(row!.children.length).toBe(0);
    expect(row!.width).toBe(100);
    expect(row!.height).toBe(100);
  });
});
