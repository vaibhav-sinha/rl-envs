import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { ComponentNode, FileEnvelope, PageNode, Paint, SceneNode } from '../model/types.js';
import { lookupAssetRecord, resolveAssetAbsolutePath } from '../images/resolveAssetBytes.js';
import { findSceneNode } from './patternTiles.js';

/** Absolute filesystem path → `file://` URL for Playwright offline screenshots. */
export function absolutePathToFileUrl(absPath: string): string {
  return pathToFileURL(absPath).href;
}

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

/** One pass over the document: component id → master root frame (for plugin exports without `envelope.components`). */
function buildInDocumentComponentMasterIndex(envelope: FileEnvelope): Map<string, SceneNode> {
  const frameById = new Map<string, SceneNode>();
  const compToRootFrameId = new Map<string, string>();
  const stack: SceneNode[] = [];
  for (const page of envelope.document.children) {
    if (page.type === 'PAGE') stack.push(...page.children);
  }
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.type === 'FRAME') frameById.set(n.id, n);
    if (n.type === 'COMPONENT') compToRootFrameId.set(n.id, (n as ComponentNode).rootFrameId);
    const ch = sceneChildren(n);
    if (ch) stack.push(...ch);
  }
  const out = new Map<string, SceneNode>();
  for (const [compId, frameId] of compToRootFrameId) {
    const frame = frameById.get(frameId);
    if (frame) out.set(compId, frame);
  }
  return out;
}

function walkComponentMaster(
  envelope: FileEnvelope,
  mainComponentId: string,
  hashes: Set<string>,
  visitingComponents: Set<string>,
  inDocumentMasters: Map<string, SceneNode>
): void {
  if (visitingComponents.has(mainComponentId)) return;
  visitingComponents.add(mainComponentId);

  const comp = envelope.components?.find((c) => c.id === mainComponentId);
  if (comp?.root) {
    walkSceneImageHashes(comp.root, envelope, hashes, visitingComponents, inDocumentMasters);
    return;
  }
  const docRoot = inDocumentMasters.get(mainComponentId);
  if (docRoot) walkSceneImageHashes(docRoot, envelope, hashes, visitingComponents, inDocumentMasters);
}

function walkSceneImageHashes(
  node: SceneNode,
  envelope: FileEnvelope,
  hashes: Set<string>,
  visitingComponents: Set<string>,
  inDocumentMasters: Map<string, SceneNode>
): void {
  if ('fills' in node) collectImageHashesFromPaints(node.fills, hashes);
  if ('strokes' in node) collectImageHashesFromPaints(node.strokes, hashes);
  if ('backgrounds' in node) collectImageHashesFromPaints(node.backgrounds, hashes);

  if (node.type === 'INSTANCE') {
    for (const c of node.children ?? [])
      walkSceneImageHashes(c, envelope, hashes, visitingComponents, inDocumentMasters);
    walkComponentMaster(envelope, node.mainComponentId, hashes, visitingComponents, inDocumentMasters);
    return;
  }
  if (node.type === 'COMPONENT_INSTANCE') {
    walkComponentMaster(envelope, node.mainComponentId, hashes, visitingComponents, inDocumentMasters);
    return;
  }
  if (node.type === 'COMPONENT') {
    walkComponentMaster(envelope, node.id, hashes, visitingComponents, inDocumentMasters);
    return;
  }

  const ch = sceneChildren(node);
  if (ch) {
    for (const c of ch) walkSceneImageHashes(c, envelope, hashes, visitingComponents, inDocumentMasters);
  }
}

/** Image hashes referenced by IMAGE paints under `rootNodeId` (PAGE or any scene node). */
export function collectImageHashesFromSubtree(envelope: FileEnvelope, rootNodeId: string): Set<string> {
  const hashes = new Set<string>();
  const visitingComponents = new Set<string>();
  const inDocumentMasters = buildInDocumentComponentMasterIndex(envelope);
  const page = envelope.document.children.find(
    (c): c is PageNode => c.type === 'PAGE' && c.id === rootNodeId
  );
  if (page) {
    collectImageHashesFromPaints(page.backgrounds, hashes);
    for (const child of page.children)
      walkSceneImageHashes(child, envelope, hashes, visitingComponents, inDocumentMasters);
    return hashes;
  }
  const root = findSceneNode(envelope, rootNodeId);
  if (root) walkSceneImageHashes(root, envelope, hashes, visitingComponents, inDocumentMasters);
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

/** Build `file://` URLs for disk assets (Playwright screenshots; avoids inlining bytes). */
export function buildImageFileUrlForHashes(
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
    const fileUrl = absolutePathToFileUrl(abs);
    out[rec.sha256] = fileUrl;
    out[rec.id] = fileUrl;
    out[hash] = fileUrl;
  }
  return out;
}

/** Subtree-scoped `file://` image map for Playwright screenshot compile. */
export function buildImageFileUrlForSubtree(
  envelope: FileEnvelope,
  jsonAbsolutePath: string,
  rootNodeId: string
): Record<string, string> {
  const hashes = collectImageHashesFromSubtree(envelope, rootNodeId);
  return buildImageFileUrlForHashes(envelope, jsonAbsolutePath, hashes);
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
