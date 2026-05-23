import { describe, expect, it } from 'vitest';
import {
  mergeDetachedChildrenIntoRoot,
  mergeRectangleFromDetached,
  mergeTextFromDetached,
  normalizeSourceFigmaId,
} from '../../src/render/instanceMerge.js';
import type { FrameNode, RectangleNode, TextNode } from '../../src/model/types.js';

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

  it('merges detached wrapper onto direct child when component root ids differ', () => {
    const masterHero: RectangleNode = {
      id: 'masterHero',
      type: 'RECTANGLE',
      name: 'Hero',
      sourceFigmaId: '2413:168361',
      x: 0,
      y: 0,
      width: 360,
      height: 424,
      fills: [{ type: 'IMAGE', imageHash: 'master-hash', scaleMode: 'FILL', visible: true, opacity: 1, blendMode: 'NORMAL' }],
    };
    const masterWrapper: FrameNode = {
      id: 'masterWrap',
      type: 'FRAME',
      name: 'Frame 427320622',
      sourceFigmaId: '2413:168359',
      x: 0,
      y: 0,
      width: 360,
      height: 440,
      layoutMode: 'VERTICAL',
      children: [masterHero],
    };
    const root: FrameNode = {
      id: 'compRoot',
      type: 'FRAME',
      name: 'Property 1=Variant2',
      sourceFigmaId: '2413:168358',
      x: 0,
      y: 0,
      width: 360,
      height: 440,
      children: [masterWrapper],
    };
    const detachedHero: RectangleNode = {
      id: 'detachedHero',
      type: 'RECTANGLE',
      name: 'Hero',
      sourceFigmaId: 'I2415:175378;2413:168361',
      x: 0,
      y: 0,
      width: 360,
      height: 424,
      fills: [{ type: 'IMAGE', imageHash: 'detached-hash', scaleMode: 'FILL', visible: true, opacity: 1, blendMode: 'NORMAL' }],
    };
    const detachedWrapper: FrameNode = {
      id: 'detachedWrap',
      type: 'FRAME',
      name: 'Frame 427320622',
      sourceFigmaId: 'I2415:175378;2413:168359',
      x: 0,
      y: 0,
      width: 360,
      height: 440,
      layoutMode: 'VERTICAL',
      children: [detachedHero],
    };
    const warnings: string[] = [];
    mergeDetachedChildrenIntoRoot(root, [detachedWrapper], { warnings });
    expect(warnings.some((w) => w.startsWith('instance_merge_unmatched_child:'))).toBe(false);
    expect(masterHero.fills?.[0]).toMatchObject({ type: 'IMAGE', imageHash: 'detached-hash' });
  });

  it('preserves master IMAGE fills when detached has empty fills without override', () => {
    const master: RectangleNode = {
      id: 'I73888',
      type: 'RECTANGLE',
      name: 'Hero',
      sourceFigmaId: '1722:37930',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [
        {
          type: 'IMAGE',
          imageHash: 'master-hash',
          scaleMode: 'FILL',
          visible: true,
          opacity: 1,
          blendMode: 'NORMAL',
        },
      ],
    };
    const detached: RectangleNode = {
      id: 'I73888d',
      type: 'RECTANGLE',
      name: 'Hero',
      sourceFigmaId: 'I9592;1722:37930',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [],
    };
    mergeRectangleFromDetached(master, detached, { warnings: [] });
    expect(master.fills?.[0]).toMatchObject({ type: 'IMAGE', imageHash: 'master-hash' });
  });

  it('clears master fills when detached has empty fills with explicit override', () => {
    const master: RectangleNode = {
      id: 'I73888',
      type: 'RECTANGLE',
      name: 'Hero',
      sourceFigmaId: '1722:37930',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [
        {
          type: 'IMAGE',
          imageHash: 'master-hash',
          scaleMode: 'FILL',
          visible: true,
          opacity: 1,
          blendMode: 'NORMAL',
        },
      ],
    };
    const detached: RectangleNode = {
      id: 'I73888d',
      type: 'RECTANGLE',
      name: 'Hero',
      sourceFigmaId: 'I9592;1722:37930',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fills: [],
    };
    mergeRectangleFromDetached(master, detached, {
      warnings: [],
      overrides: { I73888: { fills: [] } },
    });
    expect(master.fills).toEqual([]);
  });
});
