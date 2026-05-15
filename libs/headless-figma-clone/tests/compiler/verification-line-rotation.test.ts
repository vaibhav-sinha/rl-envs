import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { LineNode, RectangleNode } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERIFY_ROOT = join(__dirname, '../../verification/scenarios');

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-verify-lr-'));
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

function findNode<T extends { type: string }>(
  env: { document?: { children?: unknown[] } },
  type: T['type']
): T | undefined {
  function walk(nodes: unknown[] | undefined): T | undefined {
    for (const n of nodes ?? []) {
      const node = n as T & { children?: unknown[] };
      if (node.type === type) return node;
      const found = walk(node.children as unknown[] | undefined);
      if (found) return found;
    }
    return undefined;
  }
  return walk(env.document?.children as unknown[] | undefined);
}

async function compileScenarioScript(scriptFile: string) {
  const engine = new DocumentEngine({
    persistence: new JsonPersistence(),
    logger: createConsoleLogger('error'),
  });
  await engine.createEmptyFile({ fileName: 'Verify' });
  const code = readFileSync(join(VERIFY_ROOT, scriptFile, 'script.js'), 'utf8');
  const run = await runUseFigmaScript(code, engine);
  expect(run.kind).toBe('ok');
  if (run.kind !== 'ok') throw new Error('script failed');
  const applied = await engine.applyTransaction(run.operations);
  expect(applied.success).toBe(true);
  const rootId = run.result?.rootId;
  expect(typeof rootId).toBe('string');
  const compiled = designCompiler.compileSubtree({
    envelope: engine.getActiveFile()!,
    rootNodeId: rootId as string,
    options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
  });
  return { engine, compiled, rootId: rootId as string };
}

describe('verification scenarios 07 line stroke and 09 rotation', () => {
  it('scenario 07: line uses true endpoints, stroke weight, round caps, top-left rotation', async () => {
    await withWs(async () => {
      const { engine, compiled } = await compileScenarioScript('07-line-stroke');
      const line = findNode<LineNode>(engine.getActiveFile()!, 'LINE');
      expect(line?.width).toBe(280);
      expect(line?.height).toBe(0);
      expect(line?.strokeWeight).toBe(6);
      expect(line?.strokeCap).toBe('ROUND');
      expect(line?.rotation).toBe(15);

      const blob = `${compiled.css}\n${compiled.html}`;
      expect(blob).not.toContain('transform:rotate(15deg)');
      expect(blob).toContain('stroke-width="6"');
      expect(blob).toContain('stroke-linecap="round"');
      expect(blob).toContain('x1="3"');
      expect(blob).toContain('y1="75.469"');
      expect(blob).toContain('x2="273.459"');
      expect(blob).toContain('y2="3"');
      expect(blob).toContain('left:-3px;top:-75.469px');
      expect(blob).not.toContain('preserveAspectRatio="none"');
    });
  });

  it('scenario 09: rotated rectangle uses top-left transform origin (Figma pivot)', async () => {
    await withWs(async () => {
      const { engine, compiled } = await compileScenarioScript('09-rotation');
      const rect = findNode<RectangleNode>(engine.getActiveFile()!, 'RECTANGLE');
      expect(rect?.width).toBe(120);
      expect(rect?.height).toBe(120);
      expect(rect?.rotation).toBe(45);
      expect(rect?.x).toBe(180);
      expect(rect?.y).toBe(120);

      const blob = `${compiled.css}\n${compiled.html}`;
      expect(blob).toContain('transform:rotate(-45deg)');
      expect(blob).toContain('transform-origin:top left');
      expect(blob).not.toContain('transform-origin:center center');
      expect(blob).not.toContain('transform:rotate(45deg)');
      expect(blob).toContain('left:180px');
      expect(blob).toContain('top:120px');
    });
  });
});
