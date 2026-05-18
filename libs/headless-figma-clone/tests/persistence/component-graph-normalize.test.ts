import { describe, expect, it } from 'vitest';
import {
  COMPONENT_MASTERS_PAGE_NAME,
  documentHasGraphComponents,
  normalizeComponentEnvelope,
  nodeExistsInDocument,
} from '../../src/persistence/componentGraphNormalize.js';
import type { ComponentDefinition, FileEnvelope, FrameNode } from '../../src/model/types.js';

describe('normalizeComponentEnvelope', () => {
  it('hybrid import: inlines roots to masters page without duplicating scene COMPONENT wrappers', () => {
    const root: FrameNode = {
      id: 'I33',
      type: 'FRAME',
      name: 'FooterRoot',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      children: [],
      visible: true,
    };
    const env: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'hybrid',
      fileName: 'hybrid',
      nextInternalId: 100,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Doc',
        children: [
          {
            id: 'I30',
            type: 'PAGE',
            name: 'Ready Pages',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            children: [
              {
                id: 'I31',
                type: 'FRAME',
                name: 'Homepage',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                children: [
                  {
                    id: 'I32',
                    type: 'COMPONENT',
                    name: 'Footer',
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 20,
                    rootFrameId: 'I33',
                  },
                ],
                visible: true,
              },
            ],
          },
        ],
      },
      components: [{ id: 'I32', name: 'Footer', root }],
    };

    expect(documentHasGraphComponents(env.document)).toBe(true);
    normalizeComponentEnvelope(env);

    expect(env.components).toBeUndefined();
    expect(nodeExistsInDocument(env.document, 'I33')).toBe(true);

    const masters = env.document.children.find((p) => p.name === COMPONENT_MASTERS_PAGE_NAME);
    expect(masters?.children.some((n) => n.id === 'I33')).toBe(true);

    const ready = env.document.children.find((p) => p.name === 'Ready Pages')!;
    const topLevelIds = ready.children.map((c) => c.id);
    expect(topLevelIds).not.toContain('I33');
    expect(topLevelIds.filter((id) => id === 'I32')).toHaveLength(0);
  });
});
