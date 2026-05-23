import { describe, expect, it } from 'vitest';
import type { ComponentDefinition, DocumentNode, FileEnvelope, FrameNode, InstanceNode, PageNode } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

function minimalInstanceEnvelope(clipsContent: boolean | undefined): FileEnvelope {
  const root: FrameNode = {
    id: 'I100',
    type: 'FRAME',
    name: 'Root',
    sourceFigmaId: '1:100',
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    children: [],
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true }],
  };
  const component: ComponentDefinition = {
    id: 'I200',
    name: 'Icon',
    root,
  };
  const inst: InstanceNode = {
    id: 'I300',
    type: 'INSTANCE',
    name: 'IconInst',
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    mainComponentId: 'I200',
    ...(clipsContent !== undefined ? { clipsContent } : {}),
  };
  const page: PageNode = {
    id: 'I1',
    type: 'PAGE',
    name: 'Page',
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    children: [inst],
  };
  const doc: DocumentNode = {
    id: 'I0',
    type: 'DOCUMENT',
    name: 'Doc',
    children: [page],
  };
  return {
    schemaVersion: 1,
    fileKey: 'test',
    fileName: 'test',
    nextInternalId: 400,
    document: doc,
    components: [component],
  };
}

describe('instance wrapper overflow', () => {
  it('uses overflow:visible when clipsContent is false', () => {
    const envelope = minimalInstanceEnvelope(false);
    const inst = envelope.document.children[0]!.children[0]!;
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: inst.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(compiled.css).toContain('overflow:visible');
    expect(compiled.css).not.toMatch(/\.hfc-node-I300\{[^}]*overflow:hidden/);
  });

  it('uses overflow:hidden when clipsContent is true', () => {
    const envelope = minimalInstanceEnvelope(true);
    const inst = envelope.document.children[0]!.children[0]!;
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: inst.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(compiled.css).toMatch(/\.hfc-node-I300\{[^}]*overflow:hidden/);
  });
});
