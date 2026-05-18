import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import type { ComponentDefinition, ComponentInstanceNode, FileEnvelope, FrameNode } from '../../src/model/types.js';

describe('JsonPersistence legacy component migration', () => {
  it('migrates env.components to graph-native nodes on load', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-migrate-unit-'));
    const path = join(baseDir, 'legacy.hfc.json');
    const legacyRoot: FrameNode = {
      id: 'I10',
      type: 'FRAME',
      name: 'LegacyRoot',
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      children: [],
      visible: true,
    };
    const comp: ComponentDefinition = { id: 'COMP1', name: 'LegacyComp', root: legacyRoot };
    const inst: ComponentInstanceNode = {
      id: 'I20',
      type: 'COMPONENT_INSTANCE',
      name: 'LegacyInst',
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      mainComponentId: comp.id,
      visible: true,
    };
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'legacy',
      fileName: 'legacy',
      nextInternalId: 5,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Doc',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page',
            children: [inst],
          },
        ],
      },
      components: [comp],
    };
    writeFileSync(path, JSON.stringify(envelope), 'utf8');
    try {
      const loaded = await new JsonPersistence().load({ path });
      expect(loaded.components).toBeUndefined();
      const types = new Set<string>();
      const walk = (nodes: { type?: string; children?: unknown[] }[]): void => {
        for (const n of nodes) {
          if (n.type) types.add(n.type);
          if (Array.isArray(n.children)) walk(n.children as { type?: string; children?: unknown[] }[]);
        }
      };
      for (const page of loaded.document.children) {
        walk(page.children as { type?: string; children?: unknown[] }[]);
      }
      expect(types.has('COMPONENT')).toBe(true);
      expect(types.has('INSTANCE')).toBe(true);
      expect(types.has('COMPONENT_INSTANCE')).toBe(false);
      expect(loaded.nextInternalId).toBeGreaterThan(10);
    } finally {
      rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
