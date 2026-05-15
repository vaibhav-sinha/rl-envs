import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { EllipseNode, FileEnvelope, RectangleNode } from '../../src/model/types.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function load(name: string): FileEnvelope {
  return JSON.parse(readFileSync(join(__dirname, '../fixtures', name), 'utf8')) as FileEnvelope;
}

describe('phase7 constraints and sizing compile', () => {
  it('emits flex:1 for FILL horizontal child in auto-layout row', () => {
    const env = load('phase7-layout-sizing.hfc.json');
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('display:flex');
    const bundle = out.html + out.css;
    expect(bundle).toMatch(/flex:\s*1\s+1/);
    expect(out.html).toContain('hfc-node-I4');
    expect(out.html).toContain('hfc-node-I5');
  });

  it('emits constraint stretch styles for constrained child', () => {
    const env = load('phase7-layout-sizing.hfc.json');
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I6',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const bundle = out.html + out.css;
    expect(bundle).toContain('right:');
    expect(bundle).toContain('bottom:');
  });

  it('persists layoutSizingHorizontal FILL from verification scenario 23 script', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-s23-'));
    const prev = process.env.HFC_WORKSPACE_DIR;
    process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
    try {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 's23' });
      const script = readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios/23-layout-sizing-fill-hug/script.js'),
        'utf8'
      );
      const run = await runUseFigmaScript(script, engine);
      if (run.kind === 'error') {
        throw new Error(`${run.errorCode}: ${run.message}`);
      }
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const env = structuredClone(engine.getActiveFile()!) as FileEnvelope;
      for (const op of run.operations) applyEngineOp(env, op);
      const rootId = (run.result as { rootId?: string }).rootId;
      expect(rootId).toBeTruthy();

      const root = env.document.children[0]!.children.find((n) => n.id === rootId)!;
      const row = root.children[0]!;
      expect(row.type).toBe('FRAME');
      const fill = row.children.find((c) => c.name === 'Fill') as RectangleNode | undefined;
      expect(fill?.layoutSizingHorizontal).toBe('FILL');

      const out = designCompiler.compileSubtree({
        envelope: env,
        rootNodeId: rootId!,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(out.html + out.css).toMatch(/flex:\s*1\s+1/);
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('emits absolute positioning for ellipse child in auto-layout (scenario 25)', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-s25-'));
    const prev = process.env.HFC_WORKSPACE_DIR;
    process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
    try {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 's25' });
      const script = readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios/25-absolute-positioning/script.js'),
        'utf8'
      );
      const run = await runUseFigmaScript(script, engine);
      if (run.kind === 'error') {
        throw new Error(`${run.errorCode}: ${run.message}`);
      }
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const env = structuredClone(engine.getActiveFile()!) as FileEnvelope;
      for (const op of run.operations) applyEngineOp(env, op);
      const rootId = (run.result as { rootId?: string }).rootId;
      expect(rootId).toBeTruthy();

      const root = env.document.children[0]!.children.find((n) => n.id === rootId)!;
      const row = root.children[0]!;
      expect(row.type).toBe('FRAME');
      const badge = row.children.find((c) => c.type === 'ELLIPSE') as EllipseNode | undefined;
      expect(badge?.layoutPositioning).toBe('ABSOLUTE');
      expect(badge?.x).toBe(250);
      expect(badge?.y).toBe(8);

      const out = designCompiler.compileSubtree({
        envelope: env,
        rootNodeId: rootId!,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      const bundle = out.html + out.css;
      expect(bundle).toContain(`hfc-node-${badge!.id}`);
      expect(bundle).toContain('position:absolute');
      expect(bundle).toContain('left:250px');
      expect(bundle).toContain('top:8px');
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  });
});
