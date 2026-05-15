import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { applyAutoLayoutIntrinsicSizingDeep } from '../../src/render/autoLayoutIntrinsicSizing.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { FileEnvelope, FrameNode, SceneNode } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findVerticalFrame(env: FileEnvelope, match: (f: FrameNode) => boolean): FrameNode | null {
  function walk(nodes: SceneNode[]): FrameNode | null {
    for (const n of nodes) {
      if (n.type === 'FRAME') {
        const f = n as FrameNode;
        if (match(f)) return f;
        const hit = walk(f.children);
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

function findNodeById(env: FileEnvelope, id: string): SceneNode | null {
  function walk(nodes: SceneNode[]): SceneNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.type === 'FRAME') {
        const hit = walk((n as FrameNode).children);
        if (hit) return hit;
      }
      if (n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP') {
        const hit = walk((n as { children: SceneNode[] }).children);
        if (hit) return hit;
      }
      if (n.type === 'BOOLEAN_OPERATION') {
        const hit = walk((n as unknown as { children: SceneNode[] }).children);
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


describe('scenario 71 nested autolayout — compile-time sizing parity', () => {
  it('hugs column height to ~214; FIXED cards use flex-shrink 0 in CSS', async () => {
    const script = readFileSync(join(__dirname, '../../verification/scenarios/71-nested-autolayout/script.js'), 'utf8');
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: '71' });
    const run = await runUseFigmaScript(script, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const env = structuredClone(engine.getActiveFile()!) as FileEnvelope;
    for (const op of run.operations) applyEngineOp(env, op);
    const rootId = (run.result as { rootId: string }).rootId;

    const colPre = findVerticalFrame(
      env,
      (f) =>
        f.layoutMode === 'VERTICAL' &&
        f.itemSpacing === 14 &&
        (f.paddingTop ?? 0) === 14 &&
        f.width === 100 &&
        f.height === 100
    );
    expect(colPre).toBeTruthy();

    const rootNode = findNodeById(env, rootId);
    expect(rootNode).toBeTruthy();
    if (!rootNode) return;
    applyAutoLayoutIntrinsicSizingDeep(rootNode);

    const col = findVerticalFrame(
      env,
      (f) => f.layoutMode === 'VERTICAL' && f.itemSpacing === 14 && (f.paddingTop ?? 0) === 14
    );
    expect(col).toBeTruthy();
    if (!col) return;
    expect(col.width).toBe(100);
    expect(col.height).toBe(214);

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const bundle = out.html + out.css;
    /** Two fixed 86px-tall cards in a grown column → flex-shrink 0 on basis 86px. */
    expect(bundle).toMatch(/flex:\s*0\s+0\s+86px/);
    expect(bundle).toMatch(/rgba\(\s*56\s*,\s*122\s*,\s*224/);
    expect(bundle).toMatch(new RegExp(`\\.hfc-node-${col.id}\\{[^}]*overflow:hidden`));
  });
});
