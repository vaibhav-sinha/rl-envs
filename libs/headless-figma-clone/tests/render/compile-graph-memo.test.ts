import { describe, expect, it, vi } from 'vitest';
import * as nodeIndex from '../../src/engine/nodeIndex.js';
import {
  compileSaleSectionWithOverlay,
  getOkerSaleSectionRootId,
  loadOkerEnvelope,
} from '../helpers/okerSaleSection.js';

describe('compileSubtree graph index memo', () => {
  it('calls buildGraphIndexes at most once per overlay compileSubtree', () => {
    const buildSpy = vi.spyOn(nodeIndex, 'buildGraphIndexes');
    try {
      const envelope = loadOkerEnvelope();
      const rootId = getOkerSaleSectionRootId(envelope);
      compileSaleSectionWithOverlay(envelope, rootId);
      expect(buildSpy.mock.calls.length).toBeLessThanOrEqual(1);
    } finally {
      buildSpy.mockRestore();
    }
  });
});
