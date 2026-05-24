import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { buildGraphIndexes } from '../../src/engine/nodeIndex.js';
import {
  computeAbsoluteBoundingBox,
  computeAbsoluteOrigin,
  containerChildPageOrigin,
  getContainerParentNodeId,
  groupLocalOffsetFromContainerRelative,
  isContainerParent,
  parentRelativeFromAbsolute,
} from '../../src/geometry/coordinates.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('coordinates', () => {
  it('identifies container parents', () => {
    expect(isContainerParent('FRAME')).toBe(true);
    expect(isContainerParent('SECTION')).toBe(true);
    expect(isContainerParent('GROUP')).toBe(false);
  });

  it('PAGE → SECTION → FRAME → TEXT absolute origin chain', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const sectionId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'SECTION',
        name: 'S',
        x: 100,
        y: 200,
        width: 800,
        height: 600,
        children: [],
      },
    });
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: sectionId,
      node: {
        type: 'FRAME',
        name: 'F',
        x: 50,
        y: 60,
        width: 400,
        height: 300,
        children: [],
      },
    });
    const textId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: frameId,
      node: {
        type: 'TEXT',
        name: 'T',
        x: 10,
        y: 20,
        width: 100,
        height: 24,
        characters: 'Hi',
      },
    });

    const graph = buildGraphIndexes(env);
    expect(getContainerParentNodeId(textId, graph)).toBe(frameId);
    expect(getContainerParentNodeId(frameId, graph)).toBe(sectionId);
    expect(computeAbsoluteOrigin(sectionId, graph)).toEqual({ x: 100, y: 200 });
    expect(computeAbsoluteOrigin(frameId, graph)).toEqual({ x: 150, y: 260 });
    expect(computeAbsoluteOrigin(textId, graph)).toEqual({ x: 160, y: 280 });
    expect(computeAbsoluteBoundingBox(textId, graph)).toMatchObject({
      x: 160,
      y: 280,
      width: 100,
      height: 24,
    });
  });

  it('GROUP child coordinates relative to FRAME not GROUP', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'FRAME',
        name: 'F',
        x: 0,
        y: 0,
        width: 400,
        height: 400,
        children: [],
      },
    });
    const groupId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: frameId,
      node: {
        type: 'GROUP',
        name: 'G',
        x: 20,
        y: 30,
        width: 100,
        height: 100,
        children: [],
      },
    });
    const rectId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: groupId,
      node: {
        type: 'RECTANGLE',
        name: 'R',
        x: 80,
        y: 90,
        width: 40,
        height: 40,
      },
    });

    const graph = buildGraphIndexes(env);
    expect(getContainerParentNodeId(rectId, graph)).toBe(frameId);
    expect(computeAbsoluteOrigin(rectId, graph)).toEqual({ x: 80, y: 90 });
    expect(groupLocalOffsetFromContainerRelative({ x: 80, y: 90 }, { x: 20, y: 30 })).toEqual({
      x: 60,
      y: 60,
    });
  });

  it('nested GROUP keeps frame-relative coords', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'FRAME',
        name: 'F',
        x: 10,
        y: 10,
        width: 500,
        height: 500,
        children: [],
      },
    });
    const outerGroupId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: frameId,
      node: {
        type: 'GROUP',
        name: 'G1',
        x: 5,
        y: 5,
        width: 200,
        height: 200,
        children: [],
      },
    });
    const innerGroupId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: outerGroupId,
      node: {
        type: 'GROUP',
        name: 'G2',
        x: 15,
        y: 25,
        width: 100,
        height: 100,
        children: [],
      },
    });
    const rectId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: innerGroupId,
      node: {
        type: 'RECTANGLE',
        name: 'R',
        x: 40,
        y: 50,
        width: 10,
        height: 10,
      },
    });

    const graph = buildGraphIndexes(env);
    expect(computeAbsoluteOrigin(rectId, graph)).toEqual({ x: 50, y: 60 });
    expect(innerGroupId).toBeTruthy();
  });

  it('parentRelativeFromAbsolute subtracts container parent origin', () => {
    expect(parentRelativeFromAbsolute({ x: 160, y: 280 }, { x: 150, y: 260 })).toEqual({
      x: 10,
      y: 20,
    });
  });

  it('containerChildPageOrigin skips non-container wrappers', () => {
    expect(containerChildPageOrigin({ x: 100, y: 200 }, { x: 20, y: 30 }, 'GROUP')).toEqual({
      x: 100,
      y: 200,
    });
    expect(containerChildPageOrigin({ x: 100, y: 200 }, { x: 20, y: 30 }, 'FRAME')).toEqual({
      x: 120,
      y: 230,
    });
  });
});
