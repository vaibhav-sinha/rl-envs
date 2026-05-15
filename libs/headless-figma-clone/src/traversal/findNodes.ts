import type { AnyTreeNode, SceneNode } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

export interface FindCriteria {
  types?: string[];
  name?: string;
  /** Case-insensitive substring match when `name` is set. */
  nameMatch?: 'exact' | 'contains';
  visible?: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseFindCriteria(raw: unknown): FindCriteria {
  if (raw === undefined || raw === null) return {};
  if (!isRecord(raw)) {
    throw new ValidationErr('VALIDATION_ERROR', 'find criteria must be an object');
  }
  const out: FindCriteria = {};
  if ('types' in raw) {
    const t = raw.types;
    if (!Array.isArray(t) || !t.every((x) => typeof x === 'string')) {
      throw new ValidationErr('VALIDATION_ERROR', 'criteria.types must be string array');
    }
    out.types = t;
  }
  if ('name' in raw && raw.name !== undefined) {
    if (typeof raw.name !== 'string') {
      throw new ValidationErr('VALIDATION_ERROR', 'criteria.name must be string');
    }
    out.name = raw.name;
    const nm = raw.nameMatch;
    if (nm !== undefined) {
      if (nm !== 'exact' && nm !== 'contains') {
        throw new ValidationErr('VALIDATION_ERROR', 'criteria.nameMatch must be exact or contains');
      }
      out.nameMatch = nm;
    } else {
      out.nameMatch = 'contains';
    }
  }
  if ('visible' in raw && raw.visible !== undefined) {
    if (typeof raw.visible !== 'boolean') {
      throw new ValidationErr('VALIDATION_ERROR', 'criteria.visible must be boolean');
    }
    out.visible = raw.visible;
  }
  return out;
}

function nodeMatches(node: AnyTreeNode, criteria: FindCriteria): boolean {
  if (criteria.types && criteria.types.length > 0 && !criteria.types.includes(node.type)) {
    return false;
  }
  if (criteria.name !== undefined) {
    const n = node.name ?? '';
    const q = criteria.name;
    const mode = criteria.nameMatch ?? 'contains';
    if (mode === 'exact') {
      if (n !== q) return false;
    } else if (!n.toLowerCase().includes(q.toLowerCase())) {
      return false;
    }
  }
  if (criteria.visible !== undefined) {
    const vis = 'visible' in node ? (node as { visible?: boolean }).visible : true;
    if ((vis ?? true) !== criteria.visible) return false;
  }
  return true;
}

function collectChildren(node: AnyTreeNode): SceneNode[] {
  if (node.type === 'DOCUMENT') return [];
  if (node.type === 'PAGE') return node.children;
  if (node.type === 'FRAME' || node.type === 'TRANSFORM_GROUP' || node.type === 'GROUP' || node.type === 'SECTION') {
    return node.children;
  }
  if (node.type === 'BOOLEAN_OPERATION') return node.children as unknown as SceneNode[];
  return [];
}

function walkSubtree(node: AnyTreeNode, criteria: FindCriteria, out: AnyTreeNode[]): void {
  if (node.type !== 'DOCUMENT' && nodeMatches(node, criteria)) {
    out.push(node);
  }
  for (const ch of collectChildren(node)) {
    walkSubtree(ch, criteria, out);
  }
}

/** Depth-first walk from `root` (inclusive when not DOCUMENT). */
export function findAllNodes(root: AnyTreeNode, criteria: FindCriteria = {}): AnyTreeNode[] {
  const out: AnyTreeNode[] = [];
  if (root.type === 'DOCUMENT') {
    for (const p of root.children) walkSubtree(p, criteria, out);
  } else {
    walkSubtree(root, criteria, out);
  }
  return out;
}

export function findOneNode(root: AnyTreeNode, criteria: FindCriteria = {}): AnyTreeNode | null {
  return findAllNodes(root, criteria)[0] ?? null;
}
