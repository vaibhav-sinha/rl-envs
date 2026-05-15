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

describe('verification scenarios 38–40', () => {
  it.each(['38-transform-group', '39-text-on-path', '40-arc-ellipse'])('%s script runs', async (id) => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const run = await runScenario(id, engine);
    expect(run.kind, run.kind === 'error' ? run.message : '').toBe('ok');
  });

  it('createTextPath binds TEXT to VECTOR path', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const run = await runUseFigmaScript(
      `
const path = figma.createVector();
path.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 0 20 Q 40 0 80 20' }];
figma.currentPage.appendChild(path);
const text = figma.createTextPath(path, 0, 0);
text.characters = 'Hi';
figma.currentPage.appendChild(text);
return { pathId: path.id, textOnPath: text.textOnPath };
`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const data = run.result as { pathId: string; textOnPath: { pathId: string; startOffset: number } };
    expect(data.textOnPath).toEqual({ pathId: data.pathId, startOffset: 0 });
    const textOp = run.operations.find((o) => o.op === 'createNode' && o.node.type === 'TEXT');
    expect(textOp?.op === 'createNode' && textOp.node.type === 'TEXT' && textOp.node.textOnPath).toEqual({
      pathId: data.pathId,
      startOffset: 0,
    });
    if (textOp?.op === 'createNode' && textOp.node.type === 'TEXT') {
      expect(textOp.node.x).toBe(0);
      expect(textOp.node.y).toBe(0);
      expect(textOp.node.width).toBe(80);
      expect(textOp.node.height).toBe(10);
    }
  });

  it('transformGroup requires modifiers (Figma parity)', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const run = await runUseFigmaScript(
      `
const root = figma.createFrame();
figma.currentPage.appendChild(root);
const a = figma.createRectangle();
root.appendChild(a);
figma.transformGroup([a], root, 0);
return {};
`.trim(),
      engine
    );
    expect(run.kind).toBe('error');
    if (run.kind === 'error') {
      expect(run.message).toContain('modifiers');
      expect(run.message).toContain('Required value missing');
    }
  });
});
