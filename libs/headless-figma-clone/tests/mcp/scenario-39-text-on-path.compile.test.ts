import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { envelopeAfterScriptRun } from '../helpers/commitScriptRun.js';

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios');

describe('scenario 39 text on path compile', () => {
  it('emits textPath SVG with path-aligned viewBox', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const code = readFileSync(join(scenariosDir, '39-text-on-path/script.js'), 'utf8');
    const run = await runUseFigmaScript(code, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const env = structuredClone(envelopeAfterScriptRun(engine, run));

    const rootId = (run.result as { rootId: string }).rootId;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(out.warnings.some((w) => w.startsWith('text_on_path_invalid'))).toBe(false);
    expect(out.html).toContain('hfc-textpath-svg');
    expect(out.html).toContain('<textPath');
    expect(out.html).toContain('Curved label');
    expect(out.html).toMatch(/viewBox="0 0 320 60"/);
    expect(out.html).toMatch(/left:40px;top:80px/);
  });
});
