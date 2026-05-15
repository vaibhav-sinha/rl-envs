import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyEngineOp,
  type EngineOperation,
  DocumentEngine,
} from '../../src/engine/DocumentEngine.js';
import type { FileEnvelope } from '../../src/model/types.js';
import { mapUseFigmaToEngineOperations } from '../../src/mcp/useFigmaMap.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-par-'));
  const prev = process.env.HFC_WORKSPACE_DIR;
  process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
  return (async () => {
    try {
      return await fn();
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

function applyAll(env: FileEnvelope, ops: EngineOperation[]): void {
  for (const op of ops) {
    applyEngineOp(env, op);
  }
}

function normalizeHfcIds(s: string): string {
  let n = 0;
  const m = new Map<string, string>();
  return s.replace(/\bI[0-9]+\b/g, (id) => {
    if (!m.has(id)) {
      m.set(id, `__${String(n++)}`);
    }
    return m.get(id)!;
  });
}

describe('script vs operations parity (Phase 6)', () => {
  it('rectangle + strokeAlign + mask flag matches JSON batch after ID normalization', async () => {
    await withWs(async () => {
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'Par' });
      const base = structuredClone(engine.getActiveFile()!) as FileEnvelope;

      const jsonOps = mapUseFigmaToEngineOperations([
        {
          operation: 'createNode',
          parentId: 'I2',
          node: {
            type: 'RECTANGLE',
            name: 'R',
            x: 4,
            y: 5,
            width: 40,
            height: 22,
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
            isMask: true,
            strokeAlign: 'OUTSIDE',
          },
        },
      ]);

      const run = await runUseFigmaScript(
        `
const r = figma.createRectangle();
r.name = 'R';
r.x = 4;
r.y = 5;
r.resize(40, 22);
r.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
r.isMask = true;
r.strokeAlign = 'OUTSIDE';
figma.currentPage.appendChild(r);
return {};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const envJson = structuredClone(base) as FileEnvelope;
      applyAll(envJson, jsonOps);
      const envScript = structuredClone(base) as FileEnvelope;
      applyAll(envScript, run.operations);

      const rootJson = envJson.document.children[0]!.children[0]!.id;
      const rootSc = envScript.document.children[0]!.children[0]!.id;

      const cj = designCompiler.compileSubtree({
        envelope: envJson,
        rootNodeId: rootJson,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      const cs = designCompiler.compileSubtree({
        envelope: envScript,
        rootNodeId: rootSc,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(normalizeHfcIds(cj.html)).toBe(normalizeHfcIds(cs.html));
    });
  });
});
