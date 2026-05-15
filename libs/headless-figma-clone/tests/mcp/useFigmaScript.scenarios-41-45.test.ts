import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios');

async function runScenario(id: string, engine: DocumentEngine) {
  const code = readFileSync(join(scenariosDir, id, 'script.js'), 'utf8');
  return runUseFigmaScript(code, engine);
}

describe('verification scenarios 41–45', () => {
  it.each([
    '41-color-variable',
    '42-float-variable-spacing',
    '43-local-styles',
    '44-component-instance',
    '45-component-variants',
  ])('%s script runs', async (id) => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const run = await runScenario(id, engine);
    expect(run.kind, run.kind === 'error' ? run.message : '').toBe('ok');
  });

  it('defers setBoundVariable on detached auto-layout frame', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const run = await runUseFigmaScript(
      `
const col = figma.variables.createVariableCollection('Layout');
const modeId = col.modes[0].modeId;
const gap = figma.variables.createVariable('gap', col, 'FLOAT');
figma.variables.setValueForMode(gap.id, modeId, { type: 'FLOAT', value: 32 });
const root = figma.createFrame();
figma.currentPage.appendChild(root);
const row = figma.createAutoLayout();
row.setBoundVariable('itemSpacing', gap);
root.appendChild(row);
return { rootId: root.id };
`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const frameOp = run.operations.find(
      (o) => o.op === 'updateNode' && 'boundVariables' in o.patch && o.patch.boundVariables?.itemSpacing
    );
    expect(frameOp).toBeTruthy();
  });
});
