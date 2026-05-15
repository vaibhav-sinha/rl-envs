import type { AnyTreeNode } from '../engine/DocumentEngine.js';
import type { Effect, FrameNode, TextNode } from '../model/types.js';

export interface MetadataNodeDTO {
  id: string;
  type: string;
  name: string;
  bounds?: { x: number; y: number; width: number; height: number };
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  blendMode?: string;
  clipsContent?: boolean;
  textLength?: number;
  effectTypes?: string[];
  children?: MetadataNodeDTO[];
}

function effectList(effects: Effect[] | undefined): string[] | undefined {
  return effects?.length ? effects.map((e) => e.type) : undefined;
}

export function collectMetadataTree(
  root: AnyTreeNode,
  options: { maxDepth?: number }
): MetadataNodeDTO {
  const max = options.maxDepth ?? 1_000_000;

  function walk(node: AnyTreeNode, depth: number): MetadataNodeDTO {
    const dto: MetadataNodeDTO = {
      id: node.id,
      type: node.type,
      name: node.name,
    };
    if (node.type === 'FRAME') {
      const f = node as FrameNode;
      dto.bounds = { x: f.x, y: f.y, width: f.width, height: f.height };
      if (f.visible !== undefined) dto.visible = f.visible;
      if (f.opacity !== undefined) dto.opacity = f.opacity;
      if (f.rotation !== undefined) dto.rotation = f.rotation;
      if (f.clipsContent !== undefined) dto.clipsContent = f.clipsContent;
      if (f.blendMode !== undefined) dto.blendMode = f.blendMode;
      dto.effectTypes = effectList(f.effects);
    }
    if (node.type === 'TEXT') {
      const t = node as TextNode;
      dto.bounds = { x: t.x, y: t.y, width: t.width, height: t.height };
      dto.textLength = t.characters.length;
      if (t.visible !== undefined) dto.visible = t.visible;
      if (t.opacity !== undefined) dto.opacity = t.opacity;
      if (t.rotation !== undefined) dto.rotation = t.rotation;
      if (t.blendMode !== undefined) dto.blendMode = t.blendMode;
      dto.effectTypes = effectList(t.effects);
    }
    if (
      node.type === 'RECTANGLE' ||
      node.type === 'ELLIPSE' ||
      node.type === 'LINE' ||
      node.type === 'POLYGON' ||
      node.type === 'STAR'
    ) {
      const s = node as { x: number; y: number; width: number; height: number; effects?: Effect[]; blendMode?: string };
      dto.bounds = { x: s.x, y: s.y, width: s.width, height: s.height };
      if ('visible' in node && typeof (node as { visible?: boolean }).visible === 'boolean') {
        dto.visible = (node as { visible: boolean }).visible;
      }
      if ('opacity' in node && typeof (node as { opacity?: number }).opacity === 'number') {
        dto.opacity = (node as { opacity: number }).opacity;
      }
      if ('rotation' in node && typeof (node as { rotation?: number }).rotation === 'number') {
        dto.rotation = (node as { rotation: number }).rotation;
      }
      if (s.blendMode !== undefined) dto.blendMode = s.blendMode;
      dto.effectTypes = effectList(s.effects);
    }
    if (depth >= max) return dto;
    if (node.type === 'DOCUMENT') {
      dto.children = node.children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'PAGE') {
      dto.children = node.children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'FRAME') {
      dto.children = (node as FrameNode).children.map((c) => walk(c, depth + 1));
    }
    return dto;
  }

  return walk(root, 0);
}
