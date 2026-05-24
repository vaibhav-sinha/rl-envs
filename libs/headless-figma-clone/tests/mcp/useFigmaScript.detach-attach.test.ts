import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';
import { createConsoleLogger } from '../../src/util/logger.js';

/** Read-only task fixture; never load or save this path directly. */
const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

/** Copies the fixture into a temp workspace; applyTransaction writes only there. */
function withDesignFixture<T>(fn: (designPath: string) => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-detach-'));
  const ws = join(base, 'ws');
  const designPath = join(ws, 'design.hfc.json');
  const prev = process.env.HFC_WORKSPACE_DIR;
  return (async () => {
    try {
      mkdirSync(ws, { recursive: true });
      copyFileSync(designFixturePath, designPath);
      const assetsFixture = join(dirname(designFixturePath), 'design.hfc.assets');
      const assetsDest = join(dirname(designPath), 'design.hfc.assets');
      if (existsSync(assetsFixture)) {
        cpSync(assetsFixture, assetsDest, { recursive: true });
      }
      process.env.HFC_WORKSPACE_DIR = ws;
      return await fn(designPath);
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

describe('useFigmaScript detached frame attach (Figma parity)', () => {
  it('step 14 pattern: clone into detached frame then append to section commits', async () => {
    await withDesignFixture(async (designPath) => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      const activeFile = engine.getActiveFile()!;
      const sourceId = resolveHfcNodeIdBySourceFigmaId(activeFile, '2176:169413');
      const sectionId = resolveHfcNodeIdBySourceFigmaId(activeFile, '1621:130309');
      expect(sourceId).toBeTruthy();
      expect(sectionId).toBeTruthy();

      const run = await runUseFigmaScript(
        `
const targetPage = figma.root.children.find((p) => p.name === "Final design");
await figma.setCurrentPageAsync(targetPage);

const source = await figma.getNodeByIdAsync('${sourceId}');
const section = await figma.getNodeByIdAsync('${sectionId}');

const newFrame = figma.createFrame();
newFrame.name = 'Onboarding/OTP/MaxAttempts';
newFrame.resize(source.width, source.height);
newFrame.x = 1313.25;
newFrame.y = 1533;
newFrame.fills = source.fills ? JSON.parse(JSON.stringify(source.fills)) : [];

for (const child of source.children) {
  const childClone = child.clone();
  newFrame.appendChild(childClone);
}

section.appendChild(newFrame);

return { createdNodeIds: [newFrame.id], childCount: newFrame.children.length };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const tx =
        run.preApplied && run.committedWorking
          ? await engine.commitEnvelope(run.committedWorking, {
              touchedNodeIds: run.touchedNodeIds,
            })
          : await engine.applyTransaction(run.operations);
      expect(tx.success).toBe(true);
      if (!tx.success) return;

      const frameId = (run.result as { createdNodeIds: string[] }).createdNodeIds[0];
      const fileAfterCommit = engine.getActiveFile()!;
      const section = fileAfterCommit.document.children
        .find((p) => p.type === 'PAGE' && p.name === 'Final design')
        ?.children.find((n) => n.id === sectionId);
      expect(section?.type).toBe('SECTION');
      const frame = section && 'children' in section ? section.children.find((c) => c.id === frameId) : undefined;
      expect(frame?.name).toBe('Onboarding/OTP/MaxAttempts');
      expect(frame && 'children' in frame ? frame.children.length : 0).toBe(4);
    });
  });

  it('step 15+16: clone into attached dest commits via duplicateNode replay', async () => {
    await withDesignFixture(async (designPath) => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      const file0 = engine.getActiveFile()!;
      const sourceId = resolveHfcNodeIdBySourceFigmaId(file0, '2176:169413');
      const sectionId = resolveHfcNodeIdBySourceFigmaId(file0, '1621:130309');
      expect(sourceId).toBeTruthy();
      expect(sectionId).toBeTruthy();

      const step15 = await runUseFigmaScript(
        `
const targetPage = figma.root.children.find((p) => p.name === "Final design");
await figma.setCurrentPageAsync(targetPage);
const section = await figma.getNodeByIdAsync('${sectionId}');
const newFrame = figma.createFrame();
newFrame.name = 'Onboarding/OTP/MaxAttempts';
newFrame.resize(360, 800);
section.appendChild(newFrame);
return { frameId: newFrame.id };
`.trim(),
        engine
      );
      expect(step15.kind).toBe('ok');
      if (step15.kind !== 'ok') return;
      const tx15 =
        step15.preApplied && step15.committedWorking
          ? await engine.commitEnvelope(step15.committedWorking, {
              touchedNodeIds: step15.touchedNodeIds,
            })
          : await engine.applyTransaction(step15.operations);
      expect(tx15.success).toBe(true);

      const fileAfter15 = engine.getActiveFile()!;
      const sectionAfter15 = fileAfter15.document.children
        .find((p) => p.type === 'PAGE' && p.name === 'Final design')
        ?.children.find((n) => n.id === sectionId);
      const frameId = (step15.result as { frameId?: string }).frameId
        ?? (sectionAfter15 && 'children' in sectionAfter15
          ? sectionAfter15.children.find((c) => c.name === 'Onboarding/OTP/MaxAttempts')?.id
          : undefined);
      expect(frameId).toBeTruthy();
      const destFrameId = frameId as string;

      const step16 = await runUseFigmaScript(
        `
const targetPage = figma.root.children.find((p) => p.name === "Final design");
await figma.setCurrentPageAsync(targetPage);
const source = await figma.getNodeByIdAsync('${sourceId}');
const dest = await figma.getNodeByIdAsync('${destFrameId}');
const clonedIds = [];
for (const child of source.children) {
  const c = child.clone();
  dest.appendChild(c);
  clonedIds.push(c.id);
}
return { clonedIds, destChildCount: dest.children.length };
`.trim(),
        engine
      );
      expect(step16.kind).toBe('ok');
      if (step16.kind !== 'ok') return;

      const tx16 =
        step16.preApplied && step16.committedWorking
          ? await engine.commitEnvelope(step16.committedWorking, {
              touchedNodeIds: step16.touchedNodeIds,
            })
          : await engine.applyTransaction(step16.operations);
      expect(tx16.success).toBe(true);
      if (!tx16.success) return;

      expect((step16.result as { destChildCount: number }).destChildCount).toBeGreaterThanOrEqual(4);
    });
  });
});
