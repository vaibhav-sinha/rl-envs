import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

describe('text style import parity', () => {
  it('imports full text style fields from snapshot', () => {
    const raw = JSON.parse(readFileSync(join(fixturesDir, 'text-style-full.snapshot.json'), 'utf8'));
    const snapshot = parseFigmaPluginSnapshot(raw);
    const { envelope: env } = importFigmaPluginSnapshot(snapshot, { fileName: 'Text Style Parity' });
    const style = env.textStyles?.[0];
    expect(style).toBeDefined();
    expect(style?.name).toBe('Body/Regular');
    expect(style?.fontName).toEqual({ family: 'Inter', style: 'Regular' });
    expect(style?.fontSize).toBe(14);
    expect(style?.lineHeight).toEqual({ unit: 'PIXELS', value: 20 });
    expect(style?.letterSpacing).toEqual({ unit: 'PIXELS', value: 0 });
  });
});
