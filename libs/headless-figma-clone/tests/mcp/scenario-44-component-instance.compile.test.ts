import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios');

describe('scenario 44 component instance compile', () => {
  it('renders button component inside instance even when master is hidden', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const code = readFileSync(join(scenariosDir, '44-component-instance/script.js'), 'utf8');
    const run = await runUseFigmaScript(code, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const env = structuredClone(engine.getActiveFile()!);
    for (const op of run.operations) {
      applyEngineOp(env, op);
    }

    const rootId = (run.result as { rootId: string }).rootId;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(out.warnings, out.warnings.join(', ')).toEqual([]);
    expect(out.html).toContain('hfc-component-instance');
    expect(out.html).toContain('Button');
    expect(out.html).toMatch(/rgba\(38,\s*115,\s*242/);
    expect(out.html.split('hfc-component-instance')[1] ?? '').not.toContain('display:none');
    /** Cloned component subtree must get intrinsic text metrics (was 0×0 → wrapped label). */
    const before = out.html.slice(0, out.html.indexOf('>Button<'));
    const id = before.match(/class="(hfc-node-I[0-9]+)"[^>]*>\s*<div class="hfc-text-inner"/)?.[1];
    expect(id).toBeTruthy();
    const dotClass = `.${id}`;
    const open = out.html.indexOf(`${dotClass}{`);
    expect(open).toBeGreaterThanOrEqual(0);
    const close = out.html.indexOf('}', open);
    const rule = out.html.slice(open, close + 1);
    expect(rule).toMatch(/width:([1-9][0-9]+)px/);
    /** Hugging TEXT height uses hugTextLineHeightPx (14px label → 20px with descender slack). */
    expect(rule).toMatch(/height:20px/);
    expect(rule).not.toContain('width:0px');
  });
});
