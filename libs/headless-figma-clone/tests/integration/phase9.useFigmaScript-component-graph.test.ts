import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DocumentEngine,
  applyEngineOp,
  findEnvelopeNode,
  type EngineOperation,
} from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { FileEnvelope } from '../../src/model/types.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-phase9-uf-'));
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

function applyAll(env: FileEnvelope, ops: EngineOperation[]): void {
  for (const op of ops) applyEngineOp(env, op);
}

describe('Phase 9 component graph (useFigmaScript runtime)', () => {
  it('swapComponent selects a different component variant', async () => {
    await withWs(async () => {
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'Phase9UF' });
      const base = structuredClone(engine.getActiveFile()!) as FileEnvelope;

      const run = await runUseFigmaScript(
        `
const frameA = figma.createFrame();
frameA.name = 'VariantA';
frameA.resize(200, 60);
const textA = figma.createText();
textA.characters = 'VariantA';
textA.fontSize = 16;
frameA.appendChild(textA);
figma.currentPage.appendChild(frameA);
const compA = figma.createComponentFromNode(frameA);

const frameB = figma.createFrame();
frameB.name = 'VariantB';
frameB.resize(200, 60);
const textB = figma.createText();
textB.characters = 'VariantB';
textB.fontSize = 16;
frameB.appendChild(textB);
figma.currentPage.appendChild(frameB);
const compB = figma.createComponentFromNode(frameB);

const set = figma.combineAsVariants([compA, compB], figma.currentPage);
const inst = figma.createComponentInstance(set.id);
figma.currentPage.appendChild(inst);
inst.swapComponent(compB);

return { instId: inst.id };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const envAfter = structuredClone(base) as FileEnvelope;
      applyAll(envAfter, run.operations);

      const instId = (run.result as any)?.instId;
      expect(typeof instId).toBe('string');
      if (typeof instId !== 'string') return;

      const compiled = designCompiler.compileSubtree({
        envelope: envAfter,
        rootNodeId: instId,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(compiled.html).toContain('VariantB');
      expect(compiled.html).not.toContain('VariantA');
    });
  });

  it('detachInstance replaces INSTANCE with detached FRAME', async () => {
    await withWs(async () => {
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'Phase9UFDetach' });
      const base = structuredClone(engine.getActiveFile()!) as FileEnvelope;

      const run = await runUseFigmaScript(
        `
const frameA = figma.createFrame();
frameA.name = 'VariantA';
frameA.resize(200, 60);
const textA = figma.createText();
textA.characters = 'VariantA';
textA.fontSize = 16;
frameA.appendChild(textA);
figma.currentPage.appendChild(frameA);
const compA = figma.createComponentFromNode(frameA);

const frameB = figma.createFrame();
frameB.name = 'VariantB';
frameB.resize(200, 60);
const textB = figma.createText();
textB.characters = 'VariantB';
textB.fontSize = 16;
frameB.appendChild(textB);
figma.currentPage.appendChild(frameB);
const compB = figma.createComponentFromNode(frameB);

const set = figma.combineAsVariants([compA, compB], figma.currentPage);
const inst = figma.createComponentInstance(set.id);
figma.currentPage.appendChild(inst);
const instId = inst.id;
inst.detachInstance();

return { instId };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const envAfter = structuredClone(base) as FileEnvelope;
      applyAll(envAfter, run.operations);

      const instId = (run.result as any)?.instId;
      expect(typeof instId).toBe('string');
      if (typeof instId !== 'string') return;
      const detached = findEnvelopeNode(envAfter, instId);
      expect(detached).toBeTruthy();
      expect(detached?.type).toBe('FRAME');
      if (!detached || detached.type !== 'FRAME') return;
      expect(detached.id).toBe(instId);
      expect(detached.width).toBe(100);
      expect(detached.height).toBe(100);
    });
  });
});

