import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('useFigmaScript variantProperties', () => {
  it('returns variantProperties when mainComponent is a variant COMPONENT', async () => {
    const env = emptyEnvelope(100);
    const page = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'COMPONENT', name: 'Default', x: 0, y: 0, width: 120, height: 40, rootFrameId: rootA },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: {
        type: 'COMPONENT_SET',
        name: 'Resend',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        componentIds: [compA],
        variantPropertyKey: 'State',
        variantOptions: ['Default'],
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: {
        type: 'INSTANCE',
        name: 'Inst',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        mainComponentId: compA,
        componentProperties: { State: { type: 'VARIANT', value: 'Default' } },
      },
    });

    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-vp-'));
    const filePath = join(baseDir, 'vp.hfc.json');
    writeFileSync(filePath, JSON.stringify(env));

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.loadFromDisk({ absolutePath: filePath, save: false });

    const run = await runUseFigmaScript(
      `
const inst = figma.getNodeById('${instId}');
return { variantProperties: inst.variantProperties, componentProperties: inst.componentProperties };
`.trim(),
      engine
    );
    rmSync(baseDir, { recursive: true, force: true });

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as {
      variantProperties: Record<string, string> | null;
      componentProperties: Record<string, { value: string }>;
    };
    expect(result.variantProperties).toEqual({ State: 'Default' });
    expect(result.componentProperties.State.value).toBe('Default');
  });
});
