import type { GraphIndexes } from '../engine/nodeIndex.js';
import type { SceneNode, TextNode } from '../model/types.js';
import type { InheritedStyleField } from './styleTypes.js';

export type StyleConsumerEntry = {
  nodeId: string;
  fields: InheritedStyleField[];
};

function addField(map: Map<string, InheritedStyleField[]>, nodeId: string, field: InheritedStyleField): void {
  const prev = map.get(nodeId);
  if (prev) {
    if (!prev.includes(field)) prev.push(field);
    return;
  }
  map.set(nodeId, [field]);
}

function scanNode(node: SceneNode, styleId: string, map: Map<string, InheritedStyleField[]>): void {
  const rec = node as unknown as Record<string, unknown>;
  if (typeof rec.fillStyleId === 'string' && rec.fillStyleId === styleId) {
    addField(map, node.id, 'fillStyleId');
  }
  if (typeof rec.strokeStyleId === 'string' && rec.strokeStyleId === styleId) {
    addField(map, node.id, 'strokeStyleId');
  }
  if (typeof rec.effectStyleId === 'string' && rec.effectStyleId === styleId) {
    addField(map, node.id, 'effectStyleId');
  }
  if (typeof rec.gridStyleId === 'string' && rec.gridStyleId === styleId) {
    addField(map, node.id, 'gridStyleId');
  }
  if (node.type === 'TEXT') {
    const t = node as TextNode;
    if (t.textStyleId === styleId) addField(map, node.id, 'textStyleId');
    for (const seg of t.styledSegments ?? []) {
      if (seg.style.textStyleId === styleId) addField(map, node.id, 'textStyleId');
    }
  }
}

/** O(n) scan over cached graph index — lazy; call only from getStyleConsumersAsync. */
export function collectStyleConsumerEntries(graphIndexes: GraphIndexes, styleId: string): StyleConsumerEntry[] {
  const map = new Map<string, InheritedStyleField[]>();
  for (const node of graphIndexes.nodes.values()) {
    if (node.type === 'DOCUMENT') continue;
    if (node.type === 'PAGE') continue;
    if (node.type === 'COMPONENT') continue;
    scanNode(node as SceneNode, styleId, map);
  }
  return [...map.entries()].map(([nodeId, fields]) => ({ nodeId, fields }));
}
