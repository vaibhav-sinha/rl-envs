import type { SerializedNodeWire } from '../streamProtocol.js';
import {
  type IconTreeAnalysis,
  isCompactVectorExportSize,
  isStructuralIconExportRoot,
  type SerializedNode,
} from './iconDetector.js';

const EXPORTABLE_CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'GROUP', 'INSTANCE', 'COMPONENT_SET']);
const VECTOR_TYPES = new Set(['VECTOR', 'LINE', 'ELLIPSE', 'POLYGON', 'STAR']);

export function emptyIconAnalysis(): IconTreeAnalysis {
  return {
    vectors: 0,
    booleans: 0,
    masks: 0,
    texts: 0,
    imageFills: 0,
    rectangles: 0,
    groups: 0,
    frames: 0,
    instances: 0,
    hasMaskCluster: false,
    totalNodes: 0,
  };
}

function propWire(wire: SerializedNodeWire, key: string): unknown {
  return wire.properties[key];
}

export function analysisForWire(wire: SerializedNodeWire): IconTreeAnalysis {
  const out = emptyIconAnalysis();
  out.totalNodes = 1;

  if (wire.type === 'TEXT') out.texts = 1;
  if (VECTOR_TYPES.has(wire.type)) out.vectors = 1;
  if (wire.type === 'BOOLEAN_OPERATION') out.booleans = 1;
  if (propWire(wire, 'isMask') === true) out.masks = 1;
  if (wire.type === 'RECTANGLE') out.rectangles = 1;
  if (wire.type === 'GROUP') out.groups = 1;
  if (wire.type === 'FRAME') out.frames = 1;
  if (wire.type === 'INSTANCE') out.instances = 1;

  const fills = propWire(wire, 'fills');
  if (Array.isArray(fills)) {
    for (const f of fills) {
      if (f && typeof f === 'object' && (f as { type?: string }).type === 'IMAGE') {
        out.imageFills += 1;
      }
    }
  }

  return out;
}

function hasMaskClusterInChildFlags(flags: boolean[]): boolean {
  for (let i = 0; i < flags.length; i++) {
    if (flags[i]) {
      for (let j = i + 1; j < flags.length; j++) {
        if (!flags[j]) return true;
      }
    }
  }
  return false;
}

export function mergeIconAnalysis(
  into: IconTreeAnalysis,
  child: IconTreeAnalysis,
  directChildIsMaskFlags: boolean[]
): void {
  into.vectors += child.vectors;
  into.booleans += child.booleans;
  into.masks += child.masks;
  into.texts += child.texts;
  into.imageFills += child.imageFills;
  into.rectangles += child.rectangles;
  into.groups += child.groups;
  into.frames += child.frames;
  into.instances += child.instances;
  into.totalNodes += child.totalNodes;
  if (child.hasMaskCluster || hasMaskClusterInChildFlags(directChildIsMaskFlags)) {
    into.hasMaskCluster = true;
  }
}

function wireAsSerializedNode(wire: SerializedNodeWire): SerializedNode {
  return {
    id: wire.id,
    type: wire.type,
    name: wire.name,
    properties: wire.properties,
  };
}

export interface IconWalkFrame {
  wire: SerializedNodeWire;
  analysis: IconTreeAnalysis;
  childIsMaskFlags: boolean[];
}

export class IncrementalIconWalk {
  private readonly stack: IconWalkFrame[] = [];
  readonly parentById = new Map<string, string | null>();
  readonly iconCandidates: string[] = [];
  readonly iconAnalysisById = new Map<string, IconTreeAnalysis>();
  readonly wireById = new Map<string, SerializedNodeWire>();
  readonly mixedFillVectorIds: string[] = [];

  onTreeEnter(wire: SerializedNodeWire, parentId: string | null): void {
    this.parentById.set(wire.id, parentId);
    this.wireById.set(wire.id, wire);

    const parentFrame = this.stack[this.stack.length - 1];
    const isMask = propWire(wire, 'isMask') === true;
    if (parentFrame) parentFrame.childIsMaskFlags.push(isMask);

    this.stack.push({
      wire,
      analysis: analysisForWire(wire),
      childIsMaskFlags: [],
    });
  }

  onTreeExit(): void {
    const frame = this.stack.pop();
    if (!frame) return;

    if (EXPORTABLE_CONTAINER_TYPES.has(frame.wire.type)) {
      const node = wireAsSerializedNode(frame.wire);
      if (isStructuralIconExportRoot(node, frame.analysis)) {
        this.iconCandidates.push(frame.wire.id);
        this.iconAnalysisById.set(frame.wire.id, frame.analysis);
      }
    }

    const parent = this.stack[this.stack.length - 1];
    if (parent) {
      mergeIconAnalysis(parent.analysis, frame.analysis, frame.childIsMaskFlags);
    }
  }

  recordMixedFillVector(nodeId: string): void {
    this.mixedFillVectorIds.push(nodeId);
  }

  finishIconRootIds(): string[] {
    return filterNestedCandidates(this.iconCandidates, this.parentById);
  }

  finishMixedFillExportIds(structuralRootIds: string[]): string[] {
    const structuralRoots = new Set(structuralRootIds);
    const candidates: string[] = [];

    for (const nodeId of this.mixedFillVectorIds) {
      if (structuralRoots.has(nodeId)) continue;
      const wire = this.wireById.get(nodeId);
      if (!wire || wire.type !== 'VECTOR') continue;
      const { width, height } = boundsFromWire(wire);
      if (!isCompactVectorExportSize(width, height)) continue;
      candidates.push(nodeId);
    }

    return filterNestedCandidates(candidates, this.parentById);
  }
}

function boundsFromWire(wire: SerializedNodeWire): { width: number; height: number } {
  const p = wire.properties;
  const box = p.absoluteBoundingBox as { width?: number; height?: number } | undefined;
  const w = typeof p.width === 'number' ? p.width : typeof box?.width === 'number' ? box.width : 0;
  const h = typeof p.height === 'number' ? p.height : typeof box?.height === 'number' ? box.height : 0;
  return { width: w, height: h };
}

export function filterNestedCandidates(
  candidates: string[],
  parentById: Map<string, string | null>
): string[] {
  if (candidates.length === 0) return [];
  const candidateSet = new Set(candidates);
  return candidates.filter((id) => !hasCandidateAncestor(id, candidateSet, parentById));
}

function hasCandidateAncestor(
  nodeId: string,
  candidateIds: Set<string>,
  parentById: Map<string, string | null>
): boolean {
  let cur = parentById.get(nodeId) ?? null;
  while (cur) {
    if (candidateIds.has(cur)) return true;
    cur = parentById.get(cur) ?? null;
  }
  return false;
}
