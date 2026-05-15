import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { GroupNode, RectangleNode, SceneNode } from '../../src/model/types.js';

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios');

function findRect(nodes: SceneNode[], color: { r: number; g: number; b: number }): RectangleNode | null {
  for (const n of nodes) {
    if (n.type === 'RECTANGLE') {
      const fill = n.fills?.[0];
      if (fill?.type === 'SOLID' && fill.color.r === color.r && fill.color.g === color.g && fill.color.b === color.b) {
        return n;
      }
    }
    if ('children' in n) {
      const hit = findRect((n as { children: SceneNode[] }).children, color);
      if (hit) return hit;
    }
  }
  return null;
}

async function runScenario(id: string) {
  const engine = new DocumentEngine({
    persistence: new JsonPersistence(),
    logger: createConsoleLogger('error'),
  });
  await engine.createEmptyFile({ fileName: 'T' });
  const code = readFileSync(join(scenariosDir, `${id}/script.js`), 'utf8');
  const run = await runUseFigmaScript(code, engine);
  expect(run.kind).toBe('ok');
  if (run.kind !== 'ok') throw new Error('script failed');
  await engine.applyTransaction(run.operations);
  return { file: engine.getActiveFile()!, rootId: (run.result as { rootId: string }).rootId };
}

describe('scenarios 58–59', () => {
  it('scenario 58 keeps frame-space coords for nested groups', async () => {
    const { file, rootId } = await runScenario('58-nested-groups');
    const root = file.document.children[0]!.children.find((c) => c.id === rootId)!;
    const green = findRect([root], { r: 0.3, g: 0.8, b: 0.4 });
    const blue = findRect([root], { r: 0.2, g: 0.6, b: 0.9 });
    const red = findRect([root], { r: 0.9, g: 0.3, b: 0.2 });
    expect(green?.x).toBe(40);
    expect(green?.y).toBe(0);
    expect(blue?.x).toBe(70);
    expect(blue?.y).toBe(30);
    expect(red?.x).toBe(140);
    expect(red?.y).toBe(100);

    const rootFrame = root as import('../../src/model/types.js').FrameNode;
    const g2 = rootFrame.children[0] as GroupNode;
    expect(g2.type).toBe('GROUP');
    expect(g2.children[0].type).toBe('RECTANGLE');
    expect(g2.children[1].type).toBe('GROUP');

    const compiled = designCompiler.compileSubtree({
      envelope: file,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(compiled.html).toContain('left:40px');
    expect(compiled.html).toContain('left:70px');
    expect(compiled.html).toContain('left:140px');

    const zFor = (id: string): number => {
      const start = compiled.html.indexOf(`data-hfc-id="${id}"`);
      if (start < 0) throw new Error(`missing node ${id}`);
      const zm = compiled.html.slice(start, start + 200).match(/z-index:(\d+)/);
      if (!zm) throw new Error(`missing z-index for ${id}`);
      return Number(zm[1]);
    };
    expect(zFor(green!.id)).toBeGreaterThan(zFor(blue!.id));
    expect(zFor(blue!.id)).toBeGreaterThan(zFor(red!.id));
  });

  it('scenario 59 does not paint slice markers', async () => {
    const { file, rootId } = await runScenario('59-slice-marker');
    const compiled = designCompiler.compileSubtree({
      envelope: file,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(compiled.html).not.toContain('hfc-slice');
    expect(compiled.css).not.toContain('hfc-slice');
    expect(compiled.html).toContain('left:140px');
  });
});
