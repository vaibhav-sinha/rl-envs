import { describe, expect, it, beforeEach } from 'vitest';
import {
  hasMissingFont,
  listAvailableFonts,
  loadFontAsync,
  resetLoadedFontsForTests,
} from '../../src/fonts/fontCatalog.js';
import type { FileEnvelope } from '../../src/model/types.js';

describe('loadFontAsync', () => {
  beforeEach(() => resetLoadedFontsForTests());

  it('lists bundled fonts deterministically', () => {
    const a = listAvailableFonts();
    const b = listAvailableFonts();
    expect(a).toEqual(b);
    expect(a.some((f) => f.family === 'Inter')).toBe(true);
  });

  it('loadFontAsync registers face and clears hasMissingFont for matching text', async () => {
    const env: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'f',
      fileName: 'f',
      nextInternalId: 5,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page 1',
            children: [
              {
                id: 'I3',
                type: 'TEXT',
                name: 'T',
                x: 0,
                y: 0,
                width: 100,
                height: 24,
                characters: 'Hi',
                fontName: { family: 'Inter', style: 'Regular' },
              },
            ],
          },
        ],
      },
    };
    expect(hasMissingFont(env)).toBe(true);
    await loadFontAsync({ family: 'Inter', style: 'Regular' });
    expect(hasMissingFont(env)).toBe(false);
  });

  it('rejects unknown font', async () => {
    await expect(loadFontAsync({ family: 'NoSuchFont', style: 'Regular' })).rejects.toThrow();
  });
});
