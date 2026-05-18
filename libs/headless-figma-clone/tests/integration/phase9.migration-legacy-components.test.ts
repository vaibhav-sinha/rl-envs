import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import type { FileEnvelope, FrameNode, ComponentDefinition, ComponentInstanceNode } from '../../src/model/types.js';

function collectNodeTypes(env: FileEnvelope): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: any[]): void => {
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      if (typeof n.type === 'string') out.add(n.type);
      if (Array.isArray(n.children)) walk(n.children);
    }
  };
  for (const p of env.document.children) {
    walk((p.children ?? []) as any[]);
  }
  return out;
}

describe('Phase 9 migration: legacy env.components -> graph-native component nodes', () => {
  it('migrates COMPONENT roots + COMPONENT_INSTANCE nodes and deletes env.components', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-phase9-migrate-'));
    const path = join(baseDir, 'legacy.hfc.json');

    try {
      // Minimal legacy envelope: one component master root FRAME + one COMPONENT_INSTANCE in the page.
      const legacyRootFrame: FrameNode = {
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

      const compDef: ComponentDefinition = {
        id: 'COMP1',
        name: 'LegacyComp1',
        root: legacyRootFrame,
      };

      const legacyInstance: ComponentInstanceNode = {
        id: 'I20',
        type: 'COMPONENT_INSTANCE',
        name: 'LegacyInst',
        x: 10,
        y: 10,
        width: 100,
        height: 20,
        mainComponentId: compDef.id,
        overrides: undefined,
        visible: true,
      };

      const legacyEnv: FileEnvelope = {
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
              name: 'Page 1',
              x: 0,
              y: 0,
              width: 800,
              height: 600,
              children: [legacyInstance as any],
            },
          ],
        },
        components: [compDef],
      };

      writeFileSync(path, JSON.stringify(legacyEnv, null, 2), 'utf8');

      const loaded = await new JsonPersistence().load({ path });
      expect(loaded.components).toBeUndefined();

      const types = collectNodeTypes(loaded);
      expect(types.has('COMPONENT')).toBe(true);
      expect(types.has('INSTANCE')).toBe(true);
      expect(types.has('COMPONENT_INSTANCE')).toBe(false);

      // nextInternalId should be bumped beyond any numeric ids in the migrated document.
      expect(loaded.nextInternalId).toBeGreaterThan(20);
    } finally {
      rmSync(baseDir, { recursive: true, force: true });
    }
  });
});

