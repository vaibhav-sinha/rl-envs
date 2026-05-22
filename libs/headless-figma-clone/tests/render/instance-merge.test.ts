import { describe, expect, it } from 'vitest';
import {
  mergeDetachedChildrenIntoRoot,
  mergeTextFromDetached,
  normalizeSourceFigmaId,
} from '../../src/render/instanceMerge.js';
import type { FrameNode, TextNode } from '../../src/model/types.js';

describe('instanceMerge', () => {
  it('normalizeSourceFigmaId strips instance prefix', () => {
    expect(normalizeSourceFigmaId('I2176:169422;24:6583')).toBe('24:6583');
    expect(normalizeSourceFigmaId('24:6583')).toBe('24:6583');
  });

  it('mergeTextFromDetached copies text alignment', () => {
    const master: TextNode = {
      id: 'm1',
      type: 'TEXT',
      name: 't',
      x: 0,
      y: 0,
      width: 288,
      height: 20,
      characters: 'Input text',
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'TOP',
    };
    const detached: TextNode = {
      id: 'd1',
      type: 'TEXT',
      name: 't',
      x: 12,
      y: 12,
      width: 24,
      height: 20,
      characters: '1',
      textAlignHorizontal: 'CENTER',
      textAlignVertical: 'TOP',
      lineHeight: { unit: 'PIXELS', value: 20 },
      leadingTrim: 'NONE',
    };
    mergeTextFromDetached(master, detached);
    expect(master.textAlignHorizontal).toBe('CENTER');
    expect(master.characters).toBe('1');
    expect(master.width).toBe(24);
  });

  it('mergeDetachedChildrenIntoRoot pairs by sourceFigmaId not index', () => {
    const masterText: TextNode = {
      id: 'masterText',
      type: 'TEXT',
      name: 'B',
      sourceFigmaId: '10:2',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      characters: 'B',
      textAlignHorizontal: 'LEFT',
    };
    const masterOther: TextNode = {
      id: 'masterOther',
      type: 'TEXT',
      name: 'A',
      sourceFigmaId: '10:1',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      characters: 'A',
      textAlignHorizontal: 'LEFT',
    };
    const root: FrameNode = {
      id: 'root',
      type: 'FRAME',
      name: 'root',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [masterOther, masterText],
    };
    const detachedCentered: TextNode = {
      id: 'detachedB',
      type: 'TEXT',
      name: 'B',
      sourceFigmaId: 'I99;10:2',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      characters: 'B',
      textAlignHorizontal: 'CENTER',
    };
    const detachedOther: TextNode = {
      id: 'detachedA',
      type: 'TEXT',
      name: 'A',
      sourceFigmaId: 'I99;10:1',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      characters: 'A',
      textAlignHorizontal: 'LEFT',
    };
    const warnings: string[] = [];
    mergeDetachedChildrenIntoRoot(root, [detachedOther, detachedCentered], { warnings });
    expect(masterText.textAlignHorizontal).toBe('CENTER');
    expect(masterOther.textAlignHorizontal).toBe('LEFT');
  });
});
