import { describe, expect, it, vi } from 'vitest';
import {
  compileSaleSectionWithOverlay,
  getOkerSaleSectionRootId,
  loadOkerEnvelope,
} from '../helpers/okerSaleSection.js';

describe('compileSubtree envelope clone', () => {
  it('does not structuredClone the full envelope on overlay compileSubtree', () => {
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone');
    try {
      const envelope = loadOkerEnvelope();
      const rootId = getOkerSaleSectionRootId(envelope);
      compileSaleSectionWithOverlay(envelope, rootId);
      const fullEnvelopeClones = cloneSpy.mock.calls.filter((args) => {
        const arg = args[0] as { document?: unknown };
        return arg && typeof arg === 'object' && 'document' in arg;
      });
      expect(fullEnvelopeClones.length).toBe(0);
    } finally {
      cloneSpy.mockRestore();
    }
  });
});
