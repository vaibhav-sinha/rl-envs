import type { DocumentNode, FrameNode, SceneNode } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

export const GRID_CHILD_LAYOUT_FIELDS = [
  'gridRowSpan',
  'gridColumnSpan',
  'gridRowAnchorIndex',
  'gridColumnAnchorIndex',
] as const;

export type GridChildLayoutField = (typeof GRID_CHILD_LAYOUT_FIELDS)[number];

function findParentFrame(
  root: DocumentNode,
  id: string
): FrameNode | null {
  for (const page of root.children) {
    const hit = walkParent(page.children, id, null);
    if (hit) return hit;
  }
  return null;
}

function walkParent(nodes: SceneNode[], id: string, parent: FrameNode | null): FrameNode | null {
  for (const n of nodes) {
    if (n.id === id) return parent;
    const nextParent = n.type === 'FRAME' ? n : parent;
    if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
      const inner = walkParent(n.children, id, nextParent);
      if (inner) return inner;
    }
    if (n.type === 'BOOLEAN_OPERATION') {
      const inner = walkParent(n.children as unknown as SceneNode[], id, nextParent);
      if (inner) return inner;
    }
  }
  return null;
}

function gridChildFieldLabel(field: GridChildLayoutField): string {
  if (field === 'gridRowSpan') return 'row span';
  if (field === 'gridColumnSpan') return 'column span';
  if (field === 'gridRowAnchorIndex') return 'row anchor';
  return 'column anchor';
}

export function assertGridChildLayoutField(
  root: DocumentNode,
  nodeId: string,
  field: GridChildLayoutField | 'gridChildHorizontalAlign' | 'gridChildVerticalAlign'
): void {
  const parent = findParentFrame(root, nodeId);
  if (!parent || parent.layoutMode !== 'GRID') {
    const label =
      field === 'gridChildHorizontalAlign' || field === 'gridChildVerticalAlign'
        ? field
        : gridChildFieldLabel(field as GridChildLayoutField);
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `in set_${field}: Node must be a grid child to set ${label}`
    );
  }
}

export function validateGridSpanValue(field: 'gridRowSpan' | 'gridColumnSpan', value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ValidationErr('VALIDATION_ERROR', `${field} must be a positive integer`);
  }
  return value;
}

export function validateGridAnchorValue(
  field: 'gridRowAnchorIndex' | 'gridColumnAnchorIndex',
  value: unknown
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationErr('VALIDATION_ERROR', `${field} must be a non-negative integer`);
  }
  return value;
}
