import { describe, expect, it, beforeEach } from 'vitest';
import {
  hasMissingFont,
  isFontLoaded,
  listAvailableFonts,
  loadFontAsync,
  resetLoadedFontsForTests,
} from '../../src/fonts/fontCatalog.js';
import { applyEngineOp } from '../../src/engine/DocumentEngine.js';
import type { FileEnvelope } from '../../src/model/types.js';

describe('loadFontAsync', () => {
  beforeEach(() => resetLoadedFontsForTests());

  it('lists bundled fonts deterministically', () => {
    const a = listAvailableFonts();
    const b = listAvailableFonts();
    expect(a).toEqual(b);
    expect(a.some((f) => f.family === 'Inter')).toBe(true);
    expect(a.some((f) => f.family === 'Barlow')).toBe(true);
  });

  it('Inter is preloaded: hasMissingFont false without loadFontAsync', () => {
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
    expect(isFontLoaded({ family: 'Inter', style: 'Regular' })).toBe(true);
    expect(hasMissingFont(env)).toBe(false);
  });

  it('non-Inter text reports hasMissingFont until loadFontAsync', async () => {
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
                fontName: { family: 'Barlow', style: 'Regular' },
              },
            ],
          },
        ],
      },
    };
    expect(hasMissingFont(env)).toBe(true);
    await loadFontAsync({ family: 'Barlow', style: 'Regular' });
    expect(hasMissingFont(env)).toBe(false);
  });

  it('rejects text layout edits when a non-Inter font is not loaded', () => {
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
                fontName: { family: 'Barlow', style: 'Regular' },
              },
            ],
          },
        ],
      },
    };
    expect(() =>
      applyEngineOp(env, { op: 'updateNode', nodeId: 'I3', patch: { characters: 'Hello' } })
    ).toThrow(/not loaded/i);
  });

  it('allows text layout edits for Inter without loadFontAsync', () => {
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
              },
            ],
          },
        ],
      },
    };
    expect(() =>
      applyEngineOp(env, { op: 'updateNode', nodeId: 'I3', patch: { characters: 'Hello' } })
    ).not.toThrow();
    expect(env.document.children[0]!.children[0]!.type).toBe('TEXT');
    if (env.document.children[0]!.children[0]!.type === 'TEXT') {
      expect(env.document.children[0]!.children[0]!.characters).toBe('Hello');
    }
  });

  it('loadFontAsync succeeds for fonts not in the local manifest', async () => {
    await expect(loadFontAsync({ family: 'Barlow', style: 'Regular' })).resolves.toBeUndefined();
  });
});
