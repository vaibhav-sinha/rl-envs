import { describe, expect, it } from 'vitest';
import { DocumentEngine, applyCreateNodeOp, applyEngineOp } from '../../src/engine/DocumentEngine.js';
import { mapFrameLayout } from '../../src/import/importNodeMappers.js';
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

  it('allows patching non-grid frames with Figma gridRowCount 0 sentinel', () => {
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
            children: [
              {
                id: 'I3',
                type: 'FRAME' as const,
                name: 'Onboarding/OTP',
                x: 0,
                y: 0,
                width: 360,
                height: 800,
                layoutMode: 'NONE' as const,
                gridRowCount: 0,
                gridColumnCount: 0,
                children: [],
              },
            ],
          },
        ],
      },
      nextInternalId: 10,
    };
    expect(() =>
      applyEngineOp(file, { op: 'updateNode', nodeId: 'I3', patch: { name: 'Onboarding/OTP/MaxAttempts' } })
    ).not.toThrow();
    const frame = file.document.children[0]!.children[0]!;
    expect(frame.type).toBe('FRAME');
    expect((frame as { gridRowCount?: number }).gridRowCount).toBeUndefined();
    expect((frame as { gridColumnCount?: number }).gridColumnCount).toBeUndefined();
    expect(frame.name).toBe('Onboarding/OTP/MaxAttempts');
  });

  it('still rejects gridRowCount < 1 when layoutMode is GRID', () => {
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
            children: [
              {
                id: 'I3',
                type: 'FRAME' as const,
                name: 'Grid',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                layoutMode: 'GRID' as const,
                gridRowCount: 2,
                gridColumnCount: 2,
                children: [],
              },
            ],
          },
        ],
      },
      nextInternalId: 10,
    };
    expect(() =>
      applyEngineOp(file, { op: 'updateNode', nodeId: 'I3', patch: { gridRowCount: 0 } })
    ).toThrow(/gridRowCount must be integer >= 1/);
  });

  it('mapFrameLayout omits grid track fields when layoutMode is not GRID', () => {
    const out = mapFrameLayout(
      { layoutMode: 'NONE', gridRowCount: 0, gridColumnCount: 0, gridRowGap: 0, gridRowSizes: [] },
      100
    );
    expect(out.gridRowCount).toBeUndefined();
    expect(out.gridColumnCount).toBeUndefined();
    expect(out.gridRowGap).toBeUndefined();
    expect(out.gridRowSizes).toBeUndefined();
  });

  it('mapFrameLayout keeps grid track fields when layoutMode is GRID', () => {
    const out = mapFrameLayout({ layoutMode: 'GRID', gridRowCount: 2, gridColumnCount: 3, gridRowGap: 4 }, 100);
    expect(out.gridRowCount).toBe(2);
    expect(out.gridColumnCount).toBe(3);
    expect(out.gridRowGap).toBe(4);
  });

  it('strips auto-layout fields on NONE frames when patching name', () => {
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
            children: [
              {
                id: 'I3',
                type: 'FRAME' as const,
                name: 'Idle',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                layoutMode: 'NONE' as const,
                itemSpacing: 12,
                layoutWrap: 'NO_WRAP' as const,
                counterAxisAlignContent: 'AUTO' as const,
                children: [],
              },
            ],
          },
        ],
      },
      nextInternalId: 10,
    };
    applyEngineOp(file, { op: 'updateNode', nodeId: 'I3', patch: { name: 'Renamed' } });
    const frame = file.document.children[0]!.children[0]! as {
      itemSpacing?: number;
      layoutWrap?: string;
      counterAxisAlignContent?: string;
    };
    expect(frame.itemSpacing).toBeUndefined();
    expect(frame.layoutWrap).toBeUndefined();
    expect(frame.counterAxisAlignContent).toBeUndefined();
  });

  it('rejects layoutWrap patch when layoutMode is VERTICAL', () => {
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
            children: [
              {
                id: 'I3',
                type: 'FRAME' as const,
                name: 'V',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                layoutMode: 'VERTICAL' as const,
                children: [],
              },
            ],
          },
        ],
      },
      nextInternalId: 10,
    };
    expect(() =>
      applyEngineOp(file, { op: 'updateNode', nodeId: 'I3', patch: { layoutWrap: 'WRAP' } })
    ).toThrow(/layoutWrap requires layoutMode HORIZONTAL/);
  });

  it('rejects maxLines when textTruncation is not ENDING', () => {
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
            children: [
              {
                id: 'I3',
                type: 'TEXT' as const,
                name: 'T',
                x: 0,
                y: 0,
                width: 50,
                height: 20,
                characters: 'hi',
                fontSize: 12,
                fontWeight: 400,
                textTruncation: 'DISABLED' as const,
                children: [],
              },
            ],
          },
        ],
      },
      nextInternalId: 10,
    };
    expect(() =>
      applyEngineOp(file, { op: 'updateNode', nodeId: 'I3', patch: { maxLines: 2 } })
    ).toThrow(/maxLines requires textTruncation ENDING/);
  });

  it('mapFrameLayout omits padding on NONE frames', () => {
    const out = mapFrameLayout({ layoutMode: 'NONE', paddingLeft: 8, itemSpacing: 4 }, 100);
    expect(out.paddingLeft).toBeUndefined();
    expect(out.itemSpacing).toBeUndefined();
  });

  it('mapFrameLayout omits layoutWrap on VERTICAL frames', () => {
    const out = mapFrameLayout({ layoutMode: 'VERTICAL', layoutWrap: 'WRAP', itemSpacing: 8 }, 100);
    expect(out.layoutWrap).toBeUndefined();
    expect(out.itemSpacing).toBe(8);
  });
});
