import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import type { EngineOperation } from '../../src/engine/DocumentEngine.js';
import type { BooleanOperationNode, FileEnvelope } from '../../src/model/types.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import {
  booleanOperandPathD,
  computeBooleanPathData,
  rectCornerRadii,
  resolveBooleanDisplayFill,
} from '../../src/render/booleanPaths.js';
import { DEFAULT_SHAPE_FILLS } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenario36 = join(__dirname, '../../verification/scenarios/36-boolean-union/script.js');
const scenario37 = join(__dirname, '../../verification/scenarios/37-boolean-subtract/script.js');

function applyAll(envelope: FileEnvelope, ops: EngineOperation[]): void {
  for (const op of ops) applyEngineOp(envelope, op);
}

function findBooleanUnderFrame(envelope: FileEnvelope): BooleanOperationNode | null {
  for (const page of envelope.document.children) {
    if (page.type !== 'PAGE') continue;
    for (const n of page.children) {
      if (n.type !== 'FRAME') continue;
      const hit = n.children.find((c): c is BooleanOperationNode => c.type === 'BOOLEAN_OPERATION');
      if (hit) return hit;
    }
  }
  return null;
}

async function runScenarioScript(scriptPath: string): Promise<{
  env: FileEnvelope;
  rootId: string;
  bool: BooleanOperationNode;
}> {
  const engine = new DocumentEngine({
    persistence: new JsonPersistence(),
    logger: createConsoleLogger('error'),
  });
  await engine.createEmptyFile({ fileName: 'Bool' });
  const base = structuredClone(engine.getActiveFile()!) as FileEnvelope;
  const run = await runUseFigmaScript(readFileSync(scriptPath, 'utf8'), engine);
  expect(run.kind).toBe('ok');
  if (run.kind !== 'ok') throw new Error('script failed');
  const env = structuredClone(base) as FileEnvelope;
  applyAll(env, run.operations);
  const bool = findBooleanUnderFrame(env);
  if (!bool) throw new Error('boolean node missing');
  return { env, rootId: (run.result as { rootId: string }).rootId, bool };
}

describe('computeBooleanPathData', () => {
  it('subtract rectangle + ellipse produces a hole (scenario 37)', async () => {
    const { bool } = await runScenarioScript(scenario37);
    const { pathData, failed } = computeBooleanPathData(bool);
    expect(failed).toBe(false);
    expect(pathData.length).toBeGreaterThan(0);
    const d = pathData.join(' ');
    expect(d).toMatch(/M/);
    expect(d.length).toBeGreaterThan(20);
  });

  it('union rectangle + ellipse merges outlines (scenario 36)', async () => {
    const { bool } = await runScenarioScript(scenario36);
    const { pathData, failed } = computeBooleanPathData(bool);
    expect(failed).toBe(false);
    expect(pathData.length).toBeGreaterThan(0);
  });

  it('intersect two overlapping rectangles yields smaller region', () => {
    const bool: BooleanOperationNode = {
      id: 'B1',
      type: 'BOOLEAN_OPERATION',
      name: 'Intersect',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      booleanOperation: 'INTERSECT',
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }],
      children: [
        {
          id: 'R1',
          type: 'RECTANGLE',
          name: 'A',
          x: 0,
          y: 0,
          width: 80,
          height: 60,
          fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
        },
        {
          id: 'R2',
          type: 'RECTANGLE',
          name: 'B',
          x: 40,
          y: 30,
          width: 80,
          height: 60,
          fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 } }],
        },
      ],
    };
    const { pathData, failed } = computeBooleanPathData(bool);
    expect(failed).toBe(false);
    expect(pathData.length).toBeGreaterThan(0);
  });

  it('uses Figma default fill when boolean node has no fills', async () => {
    const { bool } = await runScenarioScript(scenario37);
    expect(bool.fills).toBeUndefined();
    const fill = resolveBooleanDisplayFill(bool);
    expect(fill).toEqual(DEFAULT_SHAPE_FILLS[0]);
  });

  it('bakes operand rotation into subtract path', () => {
    const bool: BooleanOperationNode = {
      id: 'BR',
      type: 'BOOLEAN_OPERATION',
      name: 'RotSub',
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      booleanOperation: 'SUBTRACT',
      children: [
        {
          id: 'R1',
          type: 'RECTANGLE',
          name: 'Base',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }],
        },
        {
          id: 'R2',
          type: 'RECTANGLE',
          name: 'Hole',
          x: 30,
          y: 30,
          width: 40,
          height: 40,
          rotation: 45,
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
        },
      ],
    };
    const rotated = computeBooleanPathData(bool);
    const plain = computeBooleanPathData({
      ...bool,
      children: [bool.children[0]!, { ...bool.children[1]!, rotation: 0 }],
    });
    expect(rotated.failed).toBe(false);
    expect(plain.failed).toBe(false);
    expect(rotated.pathData.join(' ')).not.toBe(plain.pathData.join(' '));
  });

  it('supports per-corner rectangle radii in boolean operands', () => {
    const rect: BooleanOperationNode['children'][0] = {
      id: 'R',
      type: 'RECTANGLE',
      name: 'Rounded',
      x: 0,
      y: 0,
      width: 100,
      height: 60,
      topLeftRadius: 20,
      topRightRadius: 4,
      bottomRightRadius: 20,
      bottomLeftRadius: 4,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }],
    };
    expect(rectCornerRadii(rect)).toEqual([20, 4, 20, 4]);
    const d = booleanOperandPathD(rect);
    expect(d).toContain('A20,20');
    expect(d).toContain('A4,4');
  });

  it('exclude two overlapping rectangles yields xor-like region', () => {
    const bool: BooleanOperationNode = {
      id: 'B2',
      type: 'BOOLEAN_OPERATION',
      name: 'Exclude',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      booleanOperation: 'EXCLUDE',
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }],
      children: [
        {
          id: 'R1',
          type: 'RECTANGLE',
          name: 'A',
          x: 0,
          y: 0,
          width: 80,
          height: 60,
          fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
        },
        {
          id: 'R2',
          type: 'RECTANGLE',
          name: 'B',
          x: 40,
          y: 30,
          width: 80,
          height: 60,
          fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 } }],
        },
      ],
    };
    const { pathData, failed } = computeBooleanPathData(bool);
    expect(failed).toBe(false);
    expect(pathData.length).toBeGreaterThan(0);
  });
});

describe('boolean compiler integration', () => {
  it('emits computed path for rect subtract fixture', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/phase4-nav-grid-mask.json'), 'utf8')
    ) as FileEnvelope;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('hfc-boolean-svg');
    expect(out.html).toContain('<path d=');
    expect(out.html).not.toContain('boolean_op_fallback');
    expect(out.html).not.toContain('boolean_op_simplified');
  });

  it('scenario 37 compile uses path-bool result not stacked operands', async () => {
    const { env, rootId } = await runScenarioScript(scenario37);
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('hfc-boolean-svg');
    expect(out.html).toContain('<path d=');
    expect(out.html).not.toContain('boolean_op_fallback');
    expect(out.warnings.filter((w) => w.startsWith('boolean_op_'))).toHaveLength(0);
  });
});
