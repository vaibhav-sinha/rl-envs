import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

function hfcRootBody(html: string): string {
  const open = html.indexOf('id="hfc-root"');
  if (open < 0) return html;
  const afterOpen = html.indexOf('>', open) + 1;
  const bodyClose = html.indexOf('</body>');
  return html.slice(afterOpen, bodyClose);
}

const COFFEE_FIXTURE =
  'C:/Users/vaibh/.headless-figma-clone/workspace/Coffee-Shop-Mobile-App-Design-Community.hfc.json';

describe('component master roots on page', () => {
  it('does not paint component root frames as top-level page scenes', () => {
    if (!existsSync(COFFEE_FIXTURE)) return;
    const env = JSON.parse(readFileSync(COFFEE_FIXTURE, 'utf8')) as FileEnvelope;

    const out = designCompiler.compileFirstPage({
      envelope: env,
      pageId: 'I141',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    const masterRootIds = new Set((env.components ?? []).map((c) => c.root.id));
    const page = env.document.children.find((c) => c.id === 'I141')!;
    const strayPageMasters = page.children.filter(
      (c) => c.type === 'FRAME' && masterRootIds.has(c.id) && c.x === 0 && c.y === 0
    );
    if (strayPageMasters.length === 0) return;

    const rootBody = hfcRootBody(out.html);
    for (const { id } of strayPageMasters) {
      const count = (rootBody.match(new RegExp(`data-hfc-id="${id}"`, 'g')) ?? []).length;
      expect(count).toBeLessThanOrEqual(1);
    }

    expect(out.html).toContain('data-hfc-id="I142"');
    expect(out.html).toContain('data-hfc-id="I178"');
    expect(out.html).toContain('hfc-component-instance');
    expect(out.html).toContain('data-hfc-id="I144"');
  });
});
