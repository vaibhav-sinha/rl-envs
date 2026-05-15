import type { EngineOperation, NewNodeSpec } from '../engine/DocumentEngine.js';

const CREATE_NODE_TYPES = new Set([
  'PAGE',
  'FRAME',
  'TEXT',
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'POLYGON',
  'STAR',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'GROUP',
  'SLICE',
  'SECTION',
  'TABLE',
  'COMPONENT',
  'COMPONENT_SET',
  'COMPONENT_INSTANCE',
  'INSTANCE',
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function mapUseFigmaToEngineOperations(operations: unknown[]): EngineOperation[] {
  const out: EngineOperation[] = [];
  for (const raw of operations) {
    if (!isRecord(raw) || typeof raw.operation !== 'string') {
      throw new Error('Invalid use_figma operation');
    }
    const op = raw.operation;
    if (op === 'createNode') {
      const parentId = raw.parentId;
      if (typeof parentId !== 'string') throw new Error('createNode.parentId required');
      const index = raw.index;
      if (index !== undefined && (typeof index !== 'number' || index < 0 || !Number.isInteger(index))) {
        throw new Error('createNode.index invalid');
      }
      const node = raw.node;
      if (!isRecord(node) || typeof node.type !== 'string' || !CREATE_NODE_TYPES.has(node.type)) {
        throw new Error(
          `createNode.node.type must be one of ${[...CREATE_NODE_TYPES].join(', ')}`
        );
      }
      out.push({ op: 'createNode', parentId, index, node: node as unknown as NewNodeSpec });
    } else if (op === 'updateNode') {
      const nodeId = raw.nodeId;
      if (typeof nodeId !== 'string') throw new Error('updateNode.nodeId required');
      const properties = raw.properties;
      if (!isRecord(properties)) throw new Error('updateNode.properties must be object');
      out.push({ op: 'updateNode', nodeId, patch: properties });
    } else if (op === 'deleteNode') {
      const nodeId = raw.nodeId;
      if (typeof nodeId !== 'string') throw new Error('deleteNode.nodeId required');
      out.push({ op: 'deleteNode', nodeId });
    } else if (op === 'moveNode') {
      const nodeId = raw.nodeId;
      const newParentId = raw.newParentId;
      if (typeof nodeId !== 'string' || typeof newParentId !== 'string') {
        throw new Error('moveNode ids required');
      }
      const index = raw.index;
      if (index !== undefined && (typeof index !== 'number' || index < 0 || !Number.isInteger(index))) {
        throw new Error('moveNode.index invalid');
      }
      out.push({ op: 'moveNode', nodeId, newParentId, index });
    } else {
      throw new Error(`Unsupported operation ${op}`);
    }
  }
  return out;
}

export function toolJson<T>(data: T) {
  return JSON.stringify({ ok: true as const, data });
}

export function toolErrorJson(code: string, message: string, details?: Record<string, unknown>) {
  return JSON.stringify({ ok: false as const, errorCode: code, message, details });
}
