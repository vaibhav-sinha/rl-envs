/**
 * Machine-readable Phase capability matrix (design-doc/document-engine.md).
 * Consumed by engine and tests.
 */
export const PHASE_MATRIX = {
  1: {
    createNode: {
      allowedChildPairs: [
        { parent: 'PAGE' as const, child: 'FRAME' as const },
        { parent: 'FRAME' as const, child: 'FRAME' as const },
      ],
      allowedRootTypesUnderDocument: ['PAGE' as const],
    },
    patchKeysByType: {
      FRAME: new Set(['name', 'x', 'y', 'width', 'height', 'fills', 'strokes', 'strokeWeight']),
      PAGE: new Set(['name', 'x', 'y', 'width', 'height']),
      DOCUMENT: new Set(['name']),
    },
    maxPaintsPerArray: 8,
  },
} as const;

export type PhaseNumber = keyof typeof PHASE_MATRIX;
