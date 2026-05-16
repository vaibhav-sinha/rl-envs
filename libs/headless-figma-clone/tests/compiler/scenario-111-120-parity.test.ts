import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios');

const PARITY_SCENARIOS: Array<{
  id: string;
  assertHtml: (html: string) => void;
}> = [
  {
    id: '111-inner-shadow-card',
    assertHtml: (html) => {
      expect(html).toMatch(/inset\s/);
      expect(html).toMatch(/box-shadow:/);
    },
  },
  {
    id: '112-layer-blur-panel',
    assertHtml: (html) => {
      expect(html).toMatch(/filter:\s*blur\(/);
    },
  },
  {
    id: '113-effect-bound-variables',
    assertHtml: (html) => {
      expect(html).toMatch(/var\(--hfc-var-/);
      expect(html).toMatch(/box-shadow:/);
    },
  },
  {
    id: '114-text-typography-list',
    assertHtml: (html) => {
      expect(html).toMatch(/Release notes/);
      expect(html).toMatch(/list-style-type:\s*decimal/);
      expect(html).toMatch(/<ol[^>]*class="hfc-text-list"/);
      expect(html.match(/<li class="hfc-list-item"/g)?.length).toBe(3);
    },
  },
  {
    id: '115-text-range-styles',
    assertHtml: (html) => {
      expect(html).toMatch(/PREMIUM/);
      expect(html).toMatch(/font-size:\s*22px/);
    },
  },
  {
    id: '116-text-stroke-label',
    assertHtml: (html) => {
      expect(html).toMatch(/LIVE/);
      expect(html).toMatch(/-webkit-text-stroke|text-stroke|stroke-width/i);
    },
  },
  {
    id: '117-grid-layout-tracks',
    assertHtml: (html) => {
      expect(html).toMatch(/display:\s*grid/);
      expect(html).toMatch(/var\(--hfc-var-/);
      expect(html.match(/grid-row:\d+ \/ span 1;grid-column:\d+ \/ span 1/g)?.length).toBeGreaterThanOrEqual(6);
    },
  },
  {
    id: '118-grid-child-span',
    assertHtml: (html) => {
      expect(html).toMatch(/display:\s*grid/);
      expect(html).toMatch(/grid-column|grid-row/);
    },
  },
  {
    id: '119-frame-gradient-stroke',
    assertHtml: (html) => {
      expect(html).toMatch(/linear-gradient|border-image|stroke/i);
    },
  },
  {
    id: '120-reverse-zindex-stack',
    assertHtml: (html) => {
      expect(html).toMatch(/box-shadow:/);
      expect(html).toMatch(/z-index/i);
    },
  },
];

async function compileScenario(id: string) {
  const engine = new DocumentEngine({
    persistence: new JsonPersistence(),
    logger: createConsoleLogger('error'),
  });
  await engine.createEmptyFile({ fileName: id });
  const run = await runUseFigmaScript(readFileSync(join(scenariosDir, id, 'script.js'), 'utf8'), engine);
  expect(run.kind).toBe('ok');
  if (run.kind !== 'ok') return null;
  const tx = await engine.applyTransaction(run.operations);
  expect(tx.success).toBe(true);
  const file = engine.getActiveFile()!;
  const rootId = (run.result as { rootId: string }).rootId;
  return designCompiler.compileSubtree({
    envelope: file,
    rootNodeId: rootId,
    options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
  });
}

describe('scenarios 111–120 API parity verification scripts', () => {
  for (const { id, assertHtml } of PARITY_SCENARIOS) {
    it(`compiles ${id}`, async () => {
      const out = await compileScenario(id);
      expect(out).not.toBeNull();
      assertHtml(out!.html);
    });
  }
});
