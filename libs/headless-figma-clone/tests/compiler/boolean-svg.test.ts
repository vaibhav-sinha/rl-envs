import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import type { EngineOperation } from '../../src/engine/DocumentEngine.js';
import type { BooleanOperationNode, FileEnvelope } from '../../src/model/types.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenario37 = join(__dirname, '../../verification/scenarios/37-boolean-subtract/script.js');

function applyAll(envelope: FileEnvelope, ops: EngineOperation[]): void {
  for (const op of ops) {
    applyEngineOp(envelope, op);
  }
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

describe('boolean SUBTRACT (two rectangles)', () => {
  it('emits computed SVG path for rectangle pair', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/phase4-nav-grid-mask.json'), 'utf8')
    ) as FileEnvelope;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('hfc-boolean-svg');
    expect(out.html).toMatch(/<path\b[^>]*\bd=/);
    expect(out.html).not.toContain('boolean_op_fallback');
  });
});

describe('boolean SUBTRACT (rectangle + ellipse)', () => {
  it('emits SVG mask with ellipse hole (scenario 37)', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Subtract' });
    const base = structuredClone(engine.getActiveFile()!) as FileEnvelope;
    const script = readFileSync(scenario37, 'utf8');
    const run = await runUseFigmaScript(script, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const env = structuredClone(base) as FileEnvelope;
    applyAll(env, run.operations);
    const subtractNode = findBooleanUnderFrame(env);
    expect(subtractNode).not.toBeNull();
    if (!subtractNode) return;
    expect(subtractNode.booleanOperation).toBe('SUBTRACT');
    expect(subtractNode.children[0]?.type).toBe('RECTANGLE');
    expect(subtractNode.children[1]?.type).toBe('ELLIPSE');
    expect(subtractNode.fills).toBeUndefined();

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: (run.result as { rootId: string }).rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('hfc-boolean-svg');
    expect(out.html).toMatch(/<path\b[^>]*\bd=/);
    expect(out.html).not.toContain('boolean_op_fallback');
    expect(out.warnings.filter((w) => w.startsWith('boolean_op_'))).toHaveLength(0);
  });
});
