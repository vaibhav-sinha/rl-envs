import type { EngineOperation, NewNodeSpec } from '../engine/DocumentEngine.js';
import type { FrameNode, TextNode } from '../model/types.js';

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
      if (!isRecord(node) || (node.type !== 'FRAME' && node.type !== 'TEXT')) {
        throw new Error('createNode.node.type must be FRAME or TEXT');
      }
      if (node.type === 'FRAME') {
        const spec: NewNodeSpec = {
          type: 'FRAME',
          name: typeof node.name === 'string' ? node.name : 'Frame',
          x: typeof node.x === 'number' ? node.x : 0,
          y: typeof node.y === 'number' ? node.y : 0,
          width: typeof node.width === 'number' ? node.width : 100,
          height: typeof node.height === 'number' ? node.height : 100,
          fills: node.fills as FrameNode['fills'],
          backgrounds: node.backgrounds as FrameNode['backgrounds'],
          strokes: node.strokes as FrameNode['strokes'],
          strokeWeight: typeof node.strokeWeight === 'number' ? node.strokeWeight : undefined,
          effects: node.effects as FrameNode['effects'],
          clipsContent: typeof node.clipsContent === 'boolean' ? node.clipsContent : undefined,
          visible: typeof node.visible === 'boolean' ? node.visible : undefined,
          opacity: typeof node.opacity === 'number' ? node.opacity : undefined,
          rotation: typeof node.rotation === 'number' ? node.rotation : undefined,
        };
        out.push({ op: 'createNode', parentId, index, node: spec });
      } else {
        const spec: NewNodeSpec = {
          type: 'TEXT',
          name: typeof node.name === 'string' ? node.name : 'Text',
          x: typeof node.x === 'number' ? node.x : 0,
          y: typeof node.y === 'number' ? node.y : 0,
          width: typeof node.width === 'number' ? node.width : 100,
          height: typeof node.height === 'number' ? node.height : 24,
          characters: typeof node.characters === 'string' ? node.characters : '',
          fontSize: typeof node.fontSize === 'number' ? node.fontSize : undefined,
          fontWeight: typeof node.fontWeight === 'number' ? node.fontWeight : undefined,
          fills: node.fills as TextNode['fills'],
          styledSegments: node.styledSegments as TextNode['styledSegments'],
          effects: node.effects as TextNode['effects'],
          visible: typeof node.visible === 'boolean' ? node.visible : undefined,
          opacity: typeof node.opacity === 'number' ? node.opacity : undefined,
          rotation: typeof node.rotation === 'number' ? node.rotation : undefined,
        };
        out.push({ op: 'createNode', parentId, index, node: spec });
      }
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
