import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, applyEngineOp } from '../../src/engine/DocumentEngine.js';
import { findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('coordinate parity (engine)', () => {
  it('moveNode preserves stored x/y without auto-rebase (Figma parity)', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const sectionId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'SECTION', name: 'S', x: 0, y: 0, width: 400, height: 400, children: [] },
    });
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 200, height: 200, children: [] },
    });
    const rectId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: frameId,
      node: { type: 'RECTANGLE', name: 'R', x: 80, y: 90, width: 20, height: 20 },
    });

    applyEngineOp(env, { op: 'moveNode', nodeId: rectId, newParentId: sectionId, index: 0 });

    const rect = findEnvelopeNode(env, rectId);
    expect(rect?.type).toBe('RECTANGLE');
    if (rect?.type !== 'RECTANGLE') return;
    expect(rect.x).toBe(80);
    expect(rect.y).toBe(90);
  });
});

describe('coordinate parity (use_figma)', () => {
  it('returns parent-relative x/y after appendChild under section', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Coords' });

    const run = await runUseFigmaScript(
      `
const section = figma.createSection();
section.name = 'Orders';
section.resize(400, 300);
section.x = 100;
section.y = 200;
figma.currentPage.appendChild(section);

const frame = figma.createFrame();
frame.name = 'Screen';
frame.resize(360, 260);
frame.x = 80;
frame.y = 80;
section.appendChild(frame);

return { x: frame.x, y: frame.y, sectionX: section.x, sectionY: section.y };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ x: 80, y: 80, sectionX: 100, sectionY: 200 });
  });
});
