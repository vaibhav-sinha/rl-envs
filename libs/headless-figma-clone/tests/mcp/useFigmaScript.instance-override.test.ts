import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine, findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import type { FileEnvelope, InstanceNode } from '../../src/model/types.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-inst-ovr-'));
  const prev = process.env.HFC_WORKSPACE_DIR;
  process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
  return (async () => {
    try {
      return await fn();
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

function masterTextCharacters(env: FileEnvelope, masterTextId: string): string | undefined {
  const node = findEnvelopeNode(env, masterTextId);
  return node?.type === 'TEXT' ? node.characters : undefined;
}

describe('useFigmaScript detached instance overrides', () => {
  it('text edits on detached createInstance route to overrides, not component master', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'InstOverride' });

      const run = await runUseFigmaScript(
        `
const frame = figma.createFrame();
frame.resize(200, 80);
const title = figma.createText();
title.characters = 'Collections';
title.fontSize = 14;
frame.appendChild(title);
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);

const inst = figma.createInstance(comp);
const textNode = inst.findOne((n) => n.type === 'TEXT');
textNode.characters = 'Order details';
figma.currentPage.appendChild(inst);

return {
  masterTextId: textNode.id,
  instanceId: inst.id,
  overrideKey: textNode.id,
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const r = run.result as { masterTextId: string; instanceId: string; overrideKey: string };
      const env = engine.getActiveFile()!;
      const masterChars = masterTextCharacters(env, r.masterTextId);
      expect(masterChars).toBe('Collections');

      const instance = findEnvelopeNode(env, r.instanceId);
      expect(instance?.type).toBe('INSTANCE');
      const overrides = (instance as InstanceNode).overrides ?? {};
      expect(overrides[r.overrideKey]?.characters).toBe('Order details');

      expect(
        run.operations.some((o) => o.op === 'updateNode' && o.nodeId === r.masterTextId)
      ).toBe(false);
      expect(run.touchedNodeIds).toContain(r.instanceId);
    });
  });
});
