import { describe, expect, it } from 'vitest';
import type {
  DocumentNode,
  FileEnvelope,
  FrameNode,
  InstanceNode,
  PageNode,
  VectorNode,
} from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const STROKE = {
  type: 'SOLID' as const,
  color: { r: 0.13333334028720856, g: 0.13333334028720856, b: 0.13333334028720856 },
  visible: true,
  opacity: 1,
  blendMode: 'NORMAL' as const,
};

function detachedCheckboxEnvelope(): FileEnvelope {
  const tickVector: VectorNode = {
    id: 'I400',
    type: 'VECTOR',
    name: 'Vector',
    x: 3,
    y: 4,
    width: 10,
    height: 8,
    vectorPaths: [
      {
        windingRule: 'NONZERO',
        data: 'M 0 0 L 10 8 L 0 8 Z',
      },
    ],
    fills: [
      {
        type: 'SOLID',
        color: { r: 0.08, g: 0.08, b: 0.08 },
        visible: true,
        opacity: 1,
        blendMode: 'NORMAL',
      },
    ],
  };

  const tickInst: InstanceNode = {
    id: 'I300',
    type: 'INSTANCE',
    name: 'tick',
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    mainComponentId: 'I0',
    children: [tickVector],
  };

  const checkboxInst: InstanceNode = {
    id: 'I200',
    type: 'INSTANCE',
    name: '_Master/Checkbox',
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    mainComponentId: 'I0',
    strokes: [STROKE],
    strokeWeight: 1,
    strokeAlign: 'INSIDE',
    fills: [
      {
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1 },
        visible: true,
        opacity: 1,
        blendMode: 'NORMAL',
      },
    ],
    children: [tickInst],
  };

  const page: PageNode = {
    id: 'I1',
    type: 'PAGE',
    name: 'Page',
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    children: [checkboxInst],
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
    nextInternalId: 500,
    document: doc,
  };
}

function strokeOnlyShellEnvelope(): FileEnvelope {
  const shellInst: InstanceNode = {
    id: 'I200',
    type: 'INSTANCE',
    name: 'StrokeShell',
    x: 0,
    y: 0,
    width: 24,
    height: 24,
    mainComponentId: 'I0',
    strokes: [STROKE],
    strokeWeight: 2,
    strokeAlign: 'INSIDE',
  };

  const page: PageNode = {
    id: 'I1',
    type: 'PAGE',
    name: 'Page',
    x: 0,
    y: 0,
    width: 24,
    height: 24,
    children: [shellInst],
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
    nextInternalId: 300,
    document: doc,
  };
}

describe('instance detached shell appearance', () => {
  it('renders instance shell strokes on detached subtree root when master is missing', () => {
    const envelope = detachedCheckboxEnvelope();
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I200',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });

    expect(compiled.html).toContain('hfc-instance-detached');
    expect(compiled.css).toMatch(/\.hfc-node-I200__detached\{[^}]*border:1px solid rgba\(34,34,34,1\)/);
    expect(compiled.css).not.toMatch(/\.hfc-node-I200__detached\{[^}]*border:none/);
  });

  it('renders stroke-only paint shell when instance has no stored children', () => {
    const envelope = strokeOnlyShellEnvelope();
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I200',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });

    expect(compiled.html).toContain('hfc-instance-shell');
    expect(compiled.css).toMatch(/\.hfc-node-I200\{[^}]*border:2px solid rgba\(34,34,34,1\)/);
  });
});
