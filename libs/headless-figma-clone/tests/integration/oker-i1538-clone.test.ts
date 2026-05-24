import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

const CLONE_CODE = `
const page = figma.root.children.find(p => p.name === 'Final design');
await figma.setCurrentPageAsync(page);
const section = await figma.getNodeByIdAsync('__SECTION_ID__');
const source = await figma.getNodeByIdAsync('__SOURCE_ID__');
const clone = source.clone();
clone.name = 'Onboarding/OTP/MaxAttempts';
clone.x = 1313.25;
clone.y = 1533;
section.appendChild(clone);
return { createdNodeIds: [clone.id], id: clone.id };
`.trim();

function withDesignFixture<T>(fn: (designPath: string) => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-oker-clone-'));
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

describe('oker I1538 clone integration', () => {
  it('commits pre-applied sandbox without replay', async () => {
    await withDesignFixture(async (designPath) => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      const file = engine.getActiveFile()!;
      const sectionId = resolveHfcNodeIdBySourceFigmaId(file, '1621:130309');
      const sourceId = resolveHfcNodeIdBySourceFigmaId(file, '2176:169413');
      expect(sectionId).toBeTruthy();
      expect(sourceId).toBeTruthy();

      const run = await runUseFigmaScript(
        CLONE_CODE.replace('__SECTION_ID__', sectionId!).replace('__SOURCE_ID__', sourceId!),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      expect(run.preApplied).toBe(true);
      expect(run.committedWorking).not.toBeNull();

      const tx = await engine.commitEnvelope(run.committedWorking!, {
        touchedNodeIds: run.touchedNodeIds,
      });
      expect(tx.success).toBe(true);
      const fileAfter = engine.getActiveFile()!;
      const createdId = (run.result as { id?: string; createdNodeIds?: string[] }).id
        ?? (run.result as { createdNodeIds?: string[] }).createdNodeIds?.[0];
      expect(createdId).toBeTruthy();

      const section = fileAfter.document.children
        .find((p) => p.type === 'PAGE' && p.name === 'Final design')
        ?.children.find((n) => n.id === sectionId);
      const frame =
        section && 'children' in section
          ? section.children.find((c) => c.id === createdId)
          : undefined;
      expect(frame?.type).toBe('FRAME');
      expect(frame && 'children' in frame ? frame.children.length : 0).toBeGreaterThanOrEqual(3);
    });
  });
});
