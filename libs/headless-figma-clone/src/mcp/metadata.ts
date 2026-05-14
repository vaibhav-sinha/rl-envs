import type { BaseNodePhase1, FrameNode } from '../model/types.js';

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
  root: BaseNodePhase1,
  options: { maxDepth?: number }
): MetadataNodeDTO {
  const max = options.maxDepth ?? 1_000_000;

  function walk(node: BaseNodePhase1, depth: number): MetadataNodeDTO {
    const dto: MetadataNodeDTO = {
      id: node.id,
      type: node.type,
      name: node.name,
    };
    if (node.type === 'FRAME') {
      const f = node as FrameNode;
      dto.bounds = { x: f.x, y: f.y, width: f.width, height: f.height };
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
