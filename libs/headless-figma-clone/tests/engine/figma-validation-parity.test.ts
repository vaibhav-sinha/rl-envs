import { describe, expect, it } from 'vitest';
import { DocumentEngine, applyCreateNodeOp, applyEngineOp } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('Figma-aligned plugin validations', () => {
  it('rejects gridRowSpan before node is a grid child', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'grid-span' });
    const run = await runUseFigmaScript(
      `
const root = figma.createFrame();
root.name = 'ScenarioRoot';
figma.currentPage.appendChild(root);
const grid = figma.createFrame();
grid.layoutMode = 'GRID';
grid.gridRowCount = 2;
grid.gridColumnCount = 2;
root.appendChild(grid);
const box = figma.createRectangle();
box.gridRowSpan = 2;
grid.appendChild(box);
return { rootId: root.id };
`,
      engine
    );
    expect(run.kind).toBe('error');
    if (run.kind === 'error') {
      expect(run.message).toContain('Node must be a grid child to set row span');
    }
  });

  it('rejects node-level listOptions assignment (use ranges)', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'list' });
    const run = await runUseFigmaScript(
      `
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const t = figma.createText();
t.characters = 'one\\ntwo';
t.listOptions = { type: 'ORDERED' };
return { rootId: t.id };
`,
      engine
    );
    expect(run.kind).toBe('error');
    if (run.kind === 'error') {
      expect(run.message).toContain('object is not extensible');
    }
  });

  it('rejects individualStrokeWeights with gradient strokes', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'stroke' });
    const run = await runUseFigmaScript(
      `
const f = figma.createFrame();
f.strokes = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0 } },
    { position: 1, color: { r: 0, g: 0, b: 1 } },
  ],
  gradientTransform: [[1,0,0],[0,1,0]],
}];
f.strokeWeight = 2;
f.individualStrokeWeights = { top: 2, right: 1, bottom: 2, left: 1 };
return { rootId: f.id };
`,
      engine
    );
    expect(run.kind).toBe('error');
    if (run.kind === 'error') {
      expect(run.message).toContain('object is not extensible');
    }
  });

  it('rejects gridRowSpan in create spec under non-grid parent', () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    const file = {
      schemaVersion: 1 as const,
      fileName: 't',
      document: {
        id: 'I1',
        type: 'DOCUMENT' as const,
        name: 'Doc',
        children: [
          {
            id: 'I2',
            type: 'PAGE' as const,
            name: 'Page',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            children: [],
          },
        ],
      },
      nextInternalId: 10,
    };
    expect(() =>
      applyCreateNodeOp(file, {
        op: 'createNode',
        parentId: 'I2',
        node: {
          type: 'RECTANGLE',
          name: 'Box',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          gridRowSpan: 2,
        },
      })
    ).toThrow(/Node must be a grid child to set row span/);
  });
});
