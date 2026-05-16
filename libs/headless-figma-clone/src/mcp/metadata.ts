import type { AnyTreeNode } from '../engine/DocumentEngine.js';
import type {
  BooleanOperationNode,
  DocumentNode,
  Effect,
  FrameNode,
  PageNode,
  TextNode,
  TransformGroupNode,
} from '../model/types.js';

export interface MetadataPageIndexEntry {
  id: string;
  name: string;
  isPageDivider?: boolean;
}

export function collectPagesIndex(document: DocumentNode): MetadataPageIndexEntry[] {
  return document.children
    .filter((c): c is PageNode => c.type === 'PAGE')
    .map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.isPageDivider !== undefined ? { isPageDivider: p.isPageDivider } : {}),
    }));
}

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
  layoutMode?: string;
  layoutWrap?: string;
  itemSpacing?: number;
  layoutGridTracks?: number;
  /** Phase 5 */
  mainComponentId?: string;
  tableColumns?: number;
  tableRows?: number;
  textStyleId?: string;
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
      if (f.layoutMode !== undefined) dto.layoutMode = f.layoutMode;
      if (f.layoutWrap !== undefined) dto.layoutWrap = f.layoutWrap;
      if (f.itemSpacing !== undefined) dto.itemSpacing = f.itemSpacing;
      const g0 = f.layoutGrids?.[0];
      if (g0?.type === 'COLUMNS' && typeof g0.count === 'number') dto.layoutGridTracks = g0.count;
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
      if (t.textStyleId) dto.textStyleId = t.textStyleId;
    }
    if (
      node.type === 'RECTANGLE' ||
      node.type === 'ELLIPSE' ||
      node.type === 'LINE' ||
      node.type === 'POLYGON' ||
      node.type === 'STAR' ||
      node.type === 'VECTOR'
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
    if (node.type === 'TRANSFORM_GROUP') {
      const tg = node as TransformGroupNode;
      dto.bounds = { x: tg.x, y: tg.y, width: tg.width, height: tg.height };
      if (tg.visible !== undefined) dto.visible = tg.visible;
      if (tg.opacity !== undefined) dto.opacity = tg.opacity;
      if (tg.rotation !== undefined) dto.rotation = tg.rotation;
      if (tg.blendMode !== undefined) dto.blendMode = tg.blendMode;
    }
    if (node.type === 'BOOLEAN_OPERATION') {
      const b = node as BooleanOperationNode;
      dto.bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
      if (b.visible !== undefined) dto.visible = b.visible;
      if (b.opacity !== undefined) dto.opacity = b.opacity;
      if (b.rotation !== undefined) dto.rotation = b.rotation;
      if (b.blendMode !== undefined) dto.blendMode = b.blendMode;
      dto.effectTypes = effectList(b.effects);
    }
    if (node.type === 'TABLE') {
      const tb = node as import('../model/types.js').TableNode;
      dto.bounds = { x: tb.x, y: tb.y, width: tb.width, height: tb.height };
      dto.tableColumns = tb.columnCount;
      dto.tableRows = tb.rowCount;
      if (tb.visible !== undefined) dto.visible = tb.visible;
      if (tb.opacity !== undefined) dto.opacity = tb.opacity;
      if (tb.rotation !== undefined) dto.rotation = tb.rotation;
      if (tb.blendMode !== undefined) dto.blendMode = tb.blendMode;
    }
    if (node.type === 'COMPONENT_INSTANCE') {
      const ci = node as import('../model/types.js').ComponentInstanceNode;
      dto.bounds = { x: ci.x, y: ci.y, width: ci.width, height: ci.height };
      dto.mainComponentId = ci.mainComponentId;
      if (ci.visible !== undefined) dto.visible = ci.visible;
      if (ci.opacity !== undefined) dto.opacity = ci.opacity;
      if (ci.rotation !== undefined) dto.rotation = ci.rotation;
      if (ci.blendMode !== undefined) dto.blendMode = ci.blendMode;
    }
  if (node.type === 'INSTANCE') {
    const inst = node as import('../model/types.js').InstanceNode;
    dto.bounds = { x: inst.x, y: inst.y, width: inst.width, height: inst.height };
    dto.mainComponentId = inst.mainComponentId;
    if (inst.visible !== undefined) dto.visible = inst.visible;
    if (inst.opacity !== undefined) dto.opacity = inst.opacity;
    if (inst.rotation !== undefined) dto.rotation = inst.rotation;
    if (inst.blendMode !== undefined) dto.blendMode = inst.blendMode;
  }
    if (depth >= max) return dto;
    if (node.type === 'DOCUMENT') {
      dto.children = node.children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'PAGE') {
      dto.children = node.children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'FRAME') {
      dto.children = (node as FrameNode).children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'TRANSFORM_GROUP') {
      dto.children = (node as TransformGroupNode).children.map((c) => walk(c, depth + 1));
    } else if (node.type === 'BOOLEAN_OPERATION') {
      dto.children = (node as BooleanOperationNode).children.map((c) => walk(c as AnyTreeNode, depth + 1));
    }
    return dto;
  }

  return walk(root, 0);
}
