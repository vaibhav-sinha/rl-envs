import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

describe('INSTANCE cleared paints import', () => {
  const snapshot = parseFigmaPluginSnapshot(
    JSON.parse(readFileSync(join(fixturesDir, 'instance-cleared-paints.snapshot.json'), 'utf8'))
  );
  const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Instance Cleared' });

  it('preserves empty fills and strokes arrays from plugin snapshot', () => {
    const page = envelope.document.children.find((p) => p.name === 'Page');
    expect(page).toBeDefined();
    const screen = page?.children.find((c) => c.name === 'Screen');
    expect(screen?.type).toBe('FRAME');
    if (screen?.type !== 'FRAME') return;

    const inst = screen.children.find((c) => c.type === 'INSTANCE' && c.name === 'ClearedBtn');
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type !== 'INSTANCE') return;

    expect(Object.prototype.hasOwnProperty.call(inst, 'fills')).toBe(true);
    expect(inst.fills).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(inst, 'strokes')).toBe(true);
    expect(inst.strokes).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(inst, 'backgrounds')).toBe(true);
    expect(inst.backgrounds).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(inst, 'effects')).toBe(true);
    expect(inst.effects).toEqual([]);
  });
});
