import { readFileSync } from 'node:fs';
import type { FileEnvelope, PageNode, Paint, SceneNode } from '../model/types.js';
import { lookupAssetRecord, resolveAssetAbsolutePath } from '../images/resolveAssetBytes.js';
import { findSceneNode } from './patternTiles.js';

function sceneChildren(n: SceneNode): SceneNode[] | null {
  if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
    return n.children;
  }
  if (n.type === 'BOOLEAN_OPERATION') return n.children;
  return null;
}

function collectImageHashesFromPaints(paints: Paint[] | undefined, hashes: Set<string>): void {
  if (!paints) return;
  for (const p of paints) {
    if (p.type === 'IMAGE') hashes.add(p.imageHash);
  }
}

function walkComponentMaster(envelope: FileEnvelope, mainComponentId: string, hashes: Set<string>): void {
  const comp = envelope.components?.find((c) => c.id === mainComponentId);
  if (comp?.root) walkSceneImageHashes(comp.root, envelope, hashes);
}

function walkSceneImageHashes(node: SceneNode, envelope: FileEnvelope, hashes: Set<string>): void {
  if ('fills' in node) collectImageHashesFromPaints(node.fills, hashes);
  if ('strokes' in node) collectImageHashesFromPaints(node.strokes, hashes);
  if ('backgrounds' in node) collectImageHashesFromPaints(node.backgrounds, hashes);

  if (node.type === 'INSTANCE') {
    for (const c of node.children ?? []) walkSceneImageHashes(c, envelope, hashes);
    walkComponentMaster(envelope, node.mainComponentId, hashes);
    return;
  }
  if (node.type === 'COMPONENT_INSTANCE') {
    walkComponentMaster(envelope, node.mainComponentId, hashes);
    return;
  }

  const ch = sceneChildren(node);
  if (ch) {
    for (const c of ch) walkSceneImageHashes(c, envelope, hashes);
  }
}

/** Image hashes referenced by IMAGE paints under `rootNodeId` (PAGE or any scene node). */
export function collectImageHashesFromSubtree(envelope: FileEnvelope, rootNodeId: string): Set<string> {
  const hashes = new Set<string>();
  const page = envelope.document.children.find(
    (c): c is PageNode => c.type === 'PAGE' && c.id === rootNodeId
  );
  if (page) {
    collectImageHashesFromPaints(page.backgrounds, hashes);
    for (const child of page.children) walkSceneImageHashes(child, envelope, hashes);
    return hashes;
  }
  const root = findSceneNode(envelope, rootNodeId);
  if (root) walkSceneImageHashes(root, envelope, hashes);
  return hashes;
}

/** Read disk bytes and build `data:` URLs only for the given registry hashes. */
export function buildImageDataUrlForHashes(
  envelope: FileEnvelope,
  jsonAbsolutePath: string,
  hashes: Iterable<string>
): Record<string, string> {
  const out: Record<string, string> = {};
  const reg = envelope.assets?.byId;
  if (!reg) return out;
  for (const hash of hashes) {
    const rec = lookupAssetRecord(reg, hash);
    if (!rec) continue;
    const abs = resolveAssetAbsolutePath(jsonAbsolutePath, rec);
    if (!abs) continue;
    try {
      const buf = readFileSync(abs);
      const dataUrl = `data:${rec.mimeType};base64,${buf.toString('base64')}`;
      out[rec.sha256] = dataUrl;
      out[rec.id] = dataUrl;
      out[hash] = dataUrl;
    } catch {
      /* missing file — compiler may warn */
    }
  }
  return out;
}

/** Subtree-scoped image map for compile / screenshot (does not load the full asset registry). */
export function buildImageDataUrlForSubtree(
  envelope: FileEnvelope,
  jsonAbsolutePath: string,
  rootNodeId: string
): Record<string, string> {
  const hashes = collectImageHashesFromSubtree(envelope, rootNodeId);
  return buildImageDataUrlForHashes(envelope, jsonAbsolutePath, hashes);
}

/**
 * @deprecated Loads every asset in the registry. Use {@link buildImageDataUrlForSubtree} instead.
 */
export function buildImageDataUrlByHash(
  envelope: FileEnvelope,
  jsonAbsolutePath: string
): Record<string, string> {
  const reg = envelope.assets?.byId;
  if (!reg) return {};
  return buildImageDataUrlForHashes(envelope, jsonAbsolutePath, Object.keys(reg));
}
