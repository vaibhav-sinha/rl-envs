import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope, FrameNode, TextNode } from '../../src/model/types.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('scenario 48 nav bar composite compile', () => {
  it('text in horizontal auto layout hugs width/height and uses flex child CSS', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-s48-'));
    const prev = process.env.HFC_WORKSPACE_DIR;
    process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
    try {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 's48' });
      const script = readFileSync(
        join(__dirname, '../../verification/scenarios/48-nav-bar-composite/script.js'),
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
      const nav = root.children[0] as FrameNode;
      const links = nav.children.find((c) => c.type === 'TEXT') as TextNode;
      expect(links.layoutSizingHorizontal).toBe('HUG');
      expect(links.layoutSizingVertical).toBe('HUG');

      const out = designCompiler.compileSubtree({
        envelope: env,
        rootNodeId: rootId!,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      const bundle = out.html + out.css;
      expect(bundle).toContain('align-items:center');
      expect(bundle).toContain(`hfc-node-${links.id}`);
      expect(bundle).toMatch(new RegExp(`\\.hfc-node-${links.id}\\{[^}]*flex:0 0 auto`));
      expect(bundle).toMatch(new RegExp(`\\.hfc-node-${links.id}\\{[^}]*height:auto`));
      expect(bundle).toMatch(new RegExp(`\\.hfc-node-${links.id}\\{[^}]*line-height:1`));
      expect(bundle).not.toMatch(new RegExp(`\\.hfc-node-${links.id}\\{[^}]*flex:1 1`));
      expect(bundle).not.toMatch(new RegExp(`\\.hfc-node-${links.id}\\{[^}]*width:200px`));
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  });
});
