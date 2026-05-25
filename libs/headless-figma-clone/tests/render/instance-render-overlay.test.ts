import { describe, expect, it } from 'vitest';
import type { FrameNode, InstanceNode } from '../../src/model/types.js';
import {
  buildInstanceRenderOverlay,
  instanceCompileNeedsClone,
} from '../../src/render/instanceRenderOverlay.js';

describe('instance render overlay (Phase 3 scaffold)', () => {
  it('requires clone fallback until overlay parity is complete', () => {
    const inst = {
      children: [],
      componentProperties: {},
    } as Pick<InstanceNode, 'children' | 'componentProperties'>;
    expect(instanceCompileNeedsClone(inst, undefined)).toBe(true);
  });

  it('buildInstanceRenderOverlay populates shell size on master root id', () => {
    const master: FrameNode = {
      id: 'M1',
      name: 'Master',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      children: [],
      fills: [],
      strokes: [],
    };
    const inst = {
      id: 'I1',
      width: 200,
      height: 80,
      children: [],
      componentProperties: {},
    } as InstanceNode;
    const overlay = buildInstanceRenderOverlay(master, inst, undefined);
    expect(overlay.instanceId).toBe('I1');
    expect(overlay.nodes.get('M1')?.width).toBe(200);
    expect(overlay.nodes.get('M1')?.height).toBe(80);
  });
});
