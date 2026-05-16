import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, applyEngineOp } from '../../src/engine/DocumentEngine.js';
import { queueGroupNodes } from '../../src/engine/graphOps.js';
import type { EngineOperation, FileEnvelope } from '../../src/engine/DocumentEngine.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

function emptyEnv(): FileEnvelope {
  return {
    schemaVersion: 1,
    fileKey: 't',
    fileName: 't',
    nextInternalId: 10,
    document: {
      id: 'I1',
      type: 'DOCUMENT',
      name: 'Document',
      children: [
        {
          id: 'I2',
          type: 'PAGE',
          name: 'Page 1',
          children: [],
        },
      ],
    },
  };
}

/** Figma GROUP: children stay in frame space; moving the group translates descendants. */
describe('group frame-space layout coords', () => {
  it('positions grouped children in frame space and omits group wrapper from CSS', () => {
    const working = emptyEnv();
    const ops: EngineOperation[] = [];
    const pageId = 'I2';
    const rootId = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'FRAME', name: 'ScenarioRoot', x: 0, y: 0, width: 480, height: 360 },
    });
    const aId = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: rootId,
      node: { type: 'RECTANGLE', name: 'A', x: 140, y: 120, width: 80, height: 80 },
    });
    const bId = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: rootId,
      node: { type: 'RECTANGLE', name: 'B', x: 180, y: 150, width: 80, height: 80 },
    });
    const groupId = queueGroupNodes(working, ops, [aId, bId], { id: rootId });
    const group = working.document.children[0]!.children[0]!.children.find((c) => c.id === groupId)!;
    expect(group.x).toBe(140);
    expect(group.y).toBe(120);
    const up: EngineOperation = { op: 'updateNode', nodeId: groupId, patch: { x: 20 } };
    ops.push(up);
    applyEngineOp(working, up);

    const page = working.document.children[0]!;
    const root = page.children[0]!;
    const out = designCompiler.compileSubtree({
      envelope: working,
      rootNodeId: root.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.css ?? ''}\n${out.html}`;

    expect(blob).toContain(`.hfc-node-${groupId}{position:absolute;left:20px;top:120px;`);
    expect(blob).toContain(`.hfc-node-${aId}{position:absolute;left:0px;top:0px;`);
    expect(blob).toContain(`.hfc-node-${bId}{position:absolute;left:40px;top:30px;`);
  });
});
