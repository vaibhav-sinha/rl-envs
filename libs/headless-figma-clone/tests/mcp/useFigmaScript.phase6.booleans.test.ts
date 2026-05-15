import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import type { EngineOperation } from '../../src/engine/DocumentEngine.js';
import type { BooleanOperationNode, FileEnvelope } from '../../src/model/types.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const scenarioDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios/36-boolean-union');

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-p6b-'));
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

function applyAll(envelope: FileEnvelope, ops: EngineOperation[]): void {
  for (const op of ops) {
    applyEngineOp(envelope, op);
  }
}

function findBooleanUnderFrame(envelope: FileEnvelope): BooleanOperationNode | null {
  for (const page of envelope.document.children) {
    if (page.type !== 'PAGE') continue;
    for (const n of page.children) {
      if (n.type !== 'FRAME') continue;
      const hit = n.children.find((c): c is BooleanOperationNode => c.type === 'BOOLEAN_OPERATION');
      if (hit) return hit;
    }
  }
  return null;
}

describe('useFigmaScript Phase 6 — booleans', () => {
  it('figma.subtract creates BOOLEAN_OPERATION and reparents operands', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'B' });
      const run = await runUseFigmaScript(
        `
const f = figma.createFrame();
figma.currentPage.appendChild(f);
const a = figma.createRectangle();
const b = figma.createRectangle();
f.appendChild(a);
f.appendChild(b);
const bool = figma.subtract([a, b], f);
return { boolId: bool.id };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const kinds = run.operations.map((o) => o.op);
      expect(kinds).toContain('createNode');
      expect(kinds.filter((k) => k === 'moveNode').length).toBeGreaterThanOrEqual(2);
      const boolCreate = run.operations.find(
        (o) => o.op === 'createNode' && o.node.type === 'BOOLEAN_OPERATION'
      );
      expect(boolCreate?.op === 'createNode' && boolCreate.node.type === 'BOOLEAN_OPERATION').toBe(true);
      if (boolCreate?.op === 'createNode' && boolCreate.node.type === 'BOOLEAN_OPERATION') {
        expect(boolCreate.node.booleanOperation).toBe('SUBTRACT');
        expect(boolCreate.node.x).toBe(0);
        expect(boolCreate.node.y).toBe(0);
        expect(boolCreate.node.width).toBe(100);
        expect(boolCreate.node.height).toBe(100);
      }
    });
  });

  it('figma.union sizes boolean to operand bounds and emits visible SVG', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Union' });
      const base = structuredClone(engine.getActiveFile()!) as FileEnvelope;
      const script = readFileSync(join(scenarioDir, 'script.js'), 'utf8');
      const run = await runUseFigmaScript(script, engine);
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const env = structuredClone(base) as FileEnvelope;
      applyAll(env, run.operations);
      const unionNode = findBooleanUnderFrame(env);
      expect(unionNode).not.toBeNull();
      if (!unionNode) return;
      expect(unionNode.booleanOperation).toBe('UNION');
      expect(unionNode.x).toBe(140);
      expect(unionNode.y).toBe(130);
      expect(unionNode.width).toBe(160);
      expect(unionNode.height).toBe(100);
      expect(unionNode.children[0]?.x).toBe(0);
      expect(unionNode.children[1]?.x).toBe(60);

      const out = designCompiler.compileSubtree({
        envelope: env,
        rootNodeId: (run.result as { rootId: string }).rootId,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(out.html).toContain('hfc-boolean-svg');
      expect(out.html).toContain('<path d=');
    });
  });
});
