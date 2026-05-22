import { describe, expect, it } from 'vitest';
import type { FrameNode } from '../../src/model/types.js';
import {
  applyInstanceAppearanceToRoot,
  applyTriStatePaintArray,
  hasOwnAppearanceField,
} from '../../src/render/instanceAppearance.js';

describe('instanceAppearance helpers', () => {
  it('applyTriStatePaintArray clears fills and drops fillStyleId', () => {
    const root: FrameNode = {
      id: 'I1',
      type: 'FRAME',
      name: 'root',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      children: [],
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true, opacity: 1, blendMode: 'NORMAL' }],
      fillStyleId: 'PS1',
    };
    applyTriStatePaintArray(root, { fills: [] }, 'fills');
    expect(root.fills).toEqual([]);
    expect(root.fillStyleId).toBeUndefined();
  });

  it('applyInstanceAppearanceToRoot inherits when keys absent', () => {
    const root: FrameNode = {
      id: 'I1',
      type: 'FRAME',
      name: 'root',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      children: [],
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true, opacity: 1, blendMode: 'NORMAL' }],
      strokes: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, visible: true, opacity: 1, blendMode: 'NORMAL' }],
    };
    applyInstanceAppearanceToRoot(root, {});
    expect(root.fills?.length).toBe(1);
    expect(root.strokes?.length).toBe(1);
  });

  it('hasOwnAppearanceField detects explicit empty arrays', () => {
    expect(hasOwnAppearanceField({ fills: [] }, 'fills')).toBe(true);
    expect(hasOwnAppearanceField({}, 'fills')).toBe(false);
  });
});
