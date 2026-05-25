import { describe, expect, it } from 'vitest';
import {
  applyCreateNodeOp,
  applyEngineOp,
  findEnvelopeNode,
} from '../../src/engine/DocumentEngine.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { commitScriptRun, envelopeAfterScriptRun } from '../helpers/commitScriptRun.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('setFillStyleIdAsync geometry parity', () => {
  it('allows updateNode fillStyleId patch on ELLIPSE and VECTOR via engine', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    env.paintStyles = [
      {
        id: 'PS_RED',
        type: 'PAINT',
        name: 'Red',
        paints: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
      },
    ];
    const ellipseId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'ELLIPSE', name: 'E', x: 0, y: 0, width: 40, height: 40 },
    });
    const vectorId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'VECTOR',
        name: 'V',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        vectorPaths: [{ windingRule: 'NONZERO', data: 'M0 0 L20 0 L20 20 Z' }],
      },
    });
    applyEngineOp(env, { op: 'updateNode', nodeId: ellipseId, patch: { fillStyleId: 'PS_RED' } });
    applyEngineOp(env, { op: 'updateNode', nodeId: vectorId, patch: { fillStyleId: 'PS_RED' } });
    const ellipse = findEnvelopeNode(env, ellipseId);
    const vector = findEnvelopeNode(env, vectorId);
    expect(ellipse?.type).toBe('ELLIPSE');
    expect(vector?.type).toBe('VECTOR');
    if (ellipse?.type === 'ELLIPSE') expect(ellipse.fillStyleId).toBe('PS_RED');
    if (vector?.type === 'VECTOR') expect(vector.fillStyleId).toBe('PS_RED');
  });

  it('setFillStyleIdAsync on ellipse and vector via use_figma script', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const code = `
const paintStyle = figma.createPaintStyle();
paintStyle.name = 'BrandFill';
paintStyle.paints = [{ type: 'SOLID', color: { r: 0.1, g: 0.45, b: 0.85 } }];
const page = figma.currentPage;
const ellipse = figma.createEllipse();
ellipse.resize(48, 48);
page.appendChild(ellipse);
const vector = figma.createVector();
vector.vectorPaths = [{ windingRule: 'NONZERO', data: 'M0 0 L40 0 L40 40 Z' }];
vector.resize(40, 40);
page.appendChild(vector);
await ellipse.setFillStyleIdAsync(paintStyle.id);
await vector.setFillStyleIdAsync(paintStyle.id);
return { ellipseId: ellipse.id, vectorId: vector.id, styleId: paintStyle.id };
`;
    const run = await runUseFigmaScript(code, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    await commitScriptRun(engine, run);
    const env = envelopeAfterScriptRun(engine, run);
    const { ellipseId, vectorId, styleId } = run.result as {
      ellipseId: string;
      vectorId: string;
      styleId: string;
    };
    const ellipse = findEnvelopeNode(env, ellipseId);
    const vector = findEnvelopeNode(env, vectorId);
    expect(ellipse?.type).toBe('ELLIPSE');
    expect(vector?.type).toBe('VECTOR');
    if (ellipse?.type === 'ELLIPSE') expect(ellipse.fillStyleId).toBe(styleId);
    if (vector?.type === 'VECTOR') expect(vector.fillStyleId).toBe(styleId);

    const ellipseHtml = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: ellipseId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(ellipseHtml.html).toMatch(/background.*26,\s*115,\s*217|background.*0\.1.*0\.45.*0\.85/i);
  });
});
