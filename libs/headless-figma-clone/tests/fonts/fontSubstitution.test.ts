import { describe, expect, it } from 'vitest';
import { resolveRenderingFontName, getFontAvailability } from '../../src/fonts/fontSubstitution.js';
import type { FileEnvelope } from '../../src/model/types.js';

describe('fontSubstitution', () => {
  it('keeps available Inter faces', () => {
    expect(resolveRenderingFontName({ family: 'Inter', style: 'Bold' })).toEqual({
      family: 'Inter',
      style: 'Bold',
    });
  });

  it('keeps available Barlow faces', () => {
    expect(resolveRenderingFontName({ family: 'Barlow', style: 'Semi Bold' })).toEqual({
      family: 'Barlow',
      style: 'Semi Bold',
    });
  });

  it('substitutes missing families to closest Inter weight', () => {
    expect(resolveRenderingFontName({ family: 'Roboto', style: 'Bold' })).toEqual({
      family: 'Inter',
      style: 'Bold',
    });
    expect(resolveRenderingFontName({ family: 'Helvetica', style: 'Regular' })).toEqual({
      family: 'Inter',
      style: 'Regular',
    });
  });

  it('reports availability for document fonts', () => {
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
                fontName: { family: 'Roboto', style: 'Regular' },
              },
            ],
          },
        ],
      },
    };
    const avail = getFontAvailability(env);
    expect(avail).toHaveLength(1);
    expect(avail[0]!.available).toBe(false);
    expect(avail[0]!.substitutedTo).toEqual({ family: 'Inter', style: 'Regular' });
  });
});
