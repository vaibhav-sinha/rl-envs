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

describe('scenario 43 local styles compile', () => {
  it('applies text style fontSize to compiled HTML', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const code = readFileSync(join(scenariosDir, '43-local-styles/script.js'), 'utf8');
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

    expect(out.html).toContain('font-size:24px');
    expect(out.html).not.toContain('font-size:12px');
  });
});
