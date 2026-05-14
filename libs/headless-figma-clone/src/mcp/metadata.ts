import type { AnyTreeNode } from '../engine/DocumentEngine.js';
import type { FrameNode, TextNode } from '../model/types.js';

export interface MetadataNodeDTO {
  id: string;
  type: string;
  name: string;
  bounds?: { x: number; y: number; width: number; height: number };
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  clipsContent?: boolean;
  textLength?: number;
  effectTypes?: string[];
  children?: MetadataNodeDTO[];
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
      if (f.effects?.length) dto.effectTypes = f.effects.map((e) => e.type);
    }
    if (node.type === 'TEXT') {
      const t = node as TextNode;
      dto.bounds = { x: t.x, y: t.y, width: t.width, height: t.height };
      dto.textLength = t.characters.length;
      if (t.visible !== undefined) dto.visible = t.visible;
      if (t.opacity !== undefined) dto.opacity = t.opacity;
      if (t.rotation !== undefined) dto.rotation = t.rotation;
      if (t.effects?.length) dto.effectTypes = t.effects.map((e) => e.type);
    }
    if (depth >= max) return dto;
    if (node.type === 'DOCUMENT') {
      dto.children = node.children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'PAGE') {
      dto.children = node.children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'FRAME') {
      dto.children = node.children.map((c) => walk(c, depth + 1));
    }
    return dto;
  }

  return walk(root, 0);
}
