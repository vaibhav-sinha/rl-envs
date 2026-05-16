import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

describe('group mask icon', () => {
  it('masks boolean icon art instead of painting the clip shape as a black square', () => {
    const raw = readFileSync(join(fixturesDir, 'group-mask-icon.snapshot.json'), 'utf8');
    const snapshot = parseFigmaPluginSnapshot(JSON.parse(raw));
    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'GroupMaskIcon' });
    const page = envelope.document.children[0]!;
    const frame = page.children.find((n) => n.type === 'FRAME' && n.name === 'SearchIcon')!;
    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: frame.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.html}\n${out.css}`;
    expect(blob).toContain('hfc-mask-wrap');
    expect(blob).toContain('hfc-boolean-svg');
    expect(blob).not.toContain('hfc-node-I4{');
    expect(blob).not.toMatch(/hfc-node-I4[^}]*background-color:rgba\(0,0,0,1\)/);
  });
});
