import { readFileSync } from 'node:fs';
import type { FileEnvelope } from '../model/types.js';
import { PersistenceError } from '../util/errors.js';
import { atomicWriteFileUtf8 } from './atomicWriteFile.js';

export interface PersistenceService {
  save(params: { path: string; envelope: FileEnvelope }): Promise<void>;
  load(params: { path: string }): Promise<FileEnvelope>;
}

export class JsonPersistence implements PersistenceService {
  async save(params: { path: string; envelope: FileEnvelope }): Promise<void> {
    const bytes = `${JSON.stringify(params.envelope, null, 2)}\n`;
    await atomicWriteFileUtf8(params.path, bytes);
  }

  async load(params: { path: string }): Promise<FileEnvelope> {
    let raw: string;
    try {
      raw = readFileSync(params.path, 'utf8');
    } catch (e) {
      throw new PersistenceError(
        e instanceof Error ? e.message : String(e),
        params.path,
        e
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new PersistenceError(
        e instanceof Error ? e.message : 'Invalid JSON',
        params.path,
        e
      );
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new PersistenceError('Envelope is not an object', params.path);
    }
    const env = parsed as FileEnvelope;
    if (env.schemaVersion !== 1) {
      throw new PersistenceError(
        `Unsupported schemaVersion: ${String(env.schemaVersion)}`,
        params.path
      );
    }
    migrateLegacyComponentsToGraphIfNeeded(env);
    return env;
  }
}

function migrateLegacyComponentsToGraphIfNeeded(env: FileEnvelope): void {
  // Already migrated (graph-native components present).
  const docHasGraphComponents = ((): boolean => {
    for (const p of env.document.children) {
      for (const n of p.children) {
        if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET' || n.type === 'INSTANCE') return true;
      }
    }
    return false;
  })();
  if (docHasGraphComponents) return;

  if (!env.components || env.components.length === 0) return;

  // Pick a page to host component wrappers + master artwork.
  const hostPage = env.document.children[0];
  if (!hostPage) return;

  for (const comp of env.components) {
    // 1) Insert the master root frame into the document.
    hostPage.children.push(comp.root);

    // 2) Add a COMPONENT wrapper that points at the master root frame.
    hostPage.children.push({
      id: comp.id,
      type: 'COMPONENT',
      name: comp.name,
      x: 0,
      y: 0,
      width: comp.root.width,
      height: comp.root.height,
      rootFrameId: comp.root.id,
    });
  }

  // Convert legacy COMPONENT_INSTANCE nodes into graph-native INSTANCE nodes.
  function walkSceneNodes(nodes: unknown[]): void {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i] as any;
      if (n && typeof n === 'object' && n.type === 'COMPONENT_INSTANCE') {
        nodes[i] = {
          ...n,
          type: 'INSTANCE',
        };
      }
      // Recurse into containers that can contain scene nodes.
      if (n && typeof n === 'object') {
        if (Array.isArray(n.children)) walkSceneNodes(n.children);
      }
    }
  }

  for (const page of env.document.children) {
    walkSceneNodes(page.children as unknown[]);
  }

  // After migration, bump nextInternalId to avoid collisions with inserted master frames.
  let maxIdNum = 0;
  const scanNodes = (nodes: any[]): void => {
    for (const n of nodes) {
      if (n && typeof n.id === 'string') {
        const m = n.id.match(/^I(\d+)$/);
        if (m) maxIdNum = Math.max(maxIdNum, Number(m[1]!));
      }
      if (n && Array.isArray(n.children)) scanNodes(n.children);
    }
  };
  scanNodes(env.document.children.flatMap((p) => (p.children ? p.children : [])) as any[]);
  if (maxIdNum + 1 > env.nextInternalId) env.nextInternalId = maxIdNum + 1;

  // Drop legacy library-only masters once migrated.
  delete (env as any).components;
}
