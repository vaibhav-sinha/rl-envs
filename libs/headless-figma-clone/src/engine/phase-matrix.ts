/**
 * Machine-readable capability matrix (design-doc/document-engine.md).
 * Consumed by engine and tests.
 */
export const ENGINE_MATRIX = {
  createNode: {
    allowedChildPairs: [
      { parent: 'PAGE' as const, child: 'FRAME' as const },
      { parent: 'PAGE' as const, child: 'TEXT' as const },
      { parent: 'FRAME' as const, child: 'FRAME' as const },
      { parent: 'FRAME' as const, child: 'TEXT' as const },
    ],
    allowedRootTypesUnderDocument: ['PAGE' as const],
  },
  patchKeysByType: {
    FRAME: new Set([
      'name',
      'x',
      'y',
      'width',
      'height',
      'fills',
      'backgrounds',
      'strokes',
      'strokeWeight',
      'effects',
      'clipsContent',
      'visible',
      'opacity',
      'rotation',
    ]),
    TEXT: new Set([
      'name',
      'x',
      'y',
      'width',
      'height',
      'characters',
      'fontSize',
      'fontWeight',
      'fills',
      'styledSegments',
      'effects',
      'visible',
      'opacity',
      'rotation',
    ]),
    PAGE: new Set(['name', 'x', 'y', 'width', 'height']),
    DOCUMENT: new Set(['name']),
  },
} as const;
