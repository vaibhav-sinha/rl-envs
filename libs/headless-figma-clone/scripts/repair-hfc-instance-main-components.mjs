#!/usr/bin/env node
/**
 * Repair INSTANCE nodes with mainComponentId "I0" when the target COMPONENT exists
 * in the same envelope (import order bug).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const UNRESOLVED = 'I0';

function walk(node, visit) {
  visit(node);
  if (node && typeof node === 'object' && Array.isArray(node.children)) {
    for (const ch of node.children) walk(ch, visit);
  }
}

/** Strip instance override prefix: I2382:161272;2382:161266 → 2382:161266 */
function baseFigmaId(sourceFigmaId) {
  if (typeof sourceFigmaId !== 'string') return undefined;
  const semi = sourceFigmaId.indexOf(';');
  if (semi >= 0) return sourceFigmaId.slice(semi + 1).split(';')[0];
  return sourceFigmaId;
}

function indexEnvelope(document) {
  /** @type {Map<string, object>} */
  const byId = new Map();
  walk(document, (n) => {
    if (n?.id) byId.set(n.id, n);
  });

  /** @type {Map<string, string[]>} */
  const componentIdsByName = new Map();
  /** @type {Map<string, Set<string>>} */
  const componentChildKeys = new Map();

  walk(document, (n) => {
    if (n?.type !== 'COMPONENT') return;
    const list = componentIdsByName.get(n.name) ?? [];
    list.push(n.id);
    componentIdsByName.set(n.name, list);

    const keys = new Set();
    const root = typeof n.rootFrameId === 'string' ? byId.get(n.rootFrameId) : undefined;
    if (root?.children) {
      for (const ch of root.children) {
        const key = baseFigmaId(ch.sourceFigmaId) ?? ch.sourceFigmaId;
        if (typeof key === 'string') keys.add(key);
      }
    }
    if (keys.size > 0) componentChildKeys.set(n.id, keys);
  });

  /** child base figma id → component id (only unambiguous keys) */
  /** @type {Map<string, string>} */
  const componentByChildKey = new Map();
  const ambiguousChildKeys = new Set();
  for (const [compId, keys] of componentChildKeys) {
    for (const key of keys) {
      const existing = componentByChildKey.get(key);
      if (existing === undefined) {
        componentByChildKey.set(key, compId);
      } else if (existing !== compId) {
        ambiguousChildKeys.add(key);
      }
    }
  }
  for (const key of ambiguousChildKeys) componentByChildKey.delete(key);

  return { componentIdsByName, componentByChildKey };
}

function resolveTarget(inst, index) {
  const { componentIdsByName, componentByChildKey } = index;

  if (inst.children?.length) {
    for (const ch of inst.children) {
      const key = baseFigmaId(ch.sourceFigmaId);
      if (!key) continue;
      const compId = componentByChildKey.get(key);
      if (compId) return compId;
    }
  }

  const sameName = componentIdsByName.get(inst.name);
  if (sameName?.length === 1) return sameName[0];

  return undefined;
}

function repairEnvelope(envelope) {
  const index = indexEnvelope(envelope.document);
  let repaired = 0;
  let stillUnresolved = 0;
  const byName = new Map();

  walk(envelope.document, (n) => {
    if (n?.type !== 'INSTANCE' || n.mainComponentId !== UNRESOLVED) return;
    const target = resolveTarget(n, index);
    if (target) {
      n.mainComponentId = target;
      repaired += 1;
      byName.set(n.name, (byName.get(n.name) ?? 0) + 1);
    } else {
      stillUnresolved += 1;
    }
  });

  return { repaired, stillUnresolved, byName };
}

const path = process.argv[2];
if (!path) {
  console.error('Usage: node repair-hfc-instance-main-components.mjs <path-to.hfc.json>');
  process.exit(1);
}

console.log(`Loading ${path}...`);
const raw = readFileSync(path, 'utf8');
const envelope = JSON.parse(raw);
const stats = repairEnvelope(envelope);

console.log(`Repaired ${stats.repaired} INSTANCE nodes (${stats.stillUnresolved} still ${UNRESOLVED})`);
const top = [...stats.byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
if (top.length) {
  console.log('Top repaired by instance name:');
  for (const [name, count] of top) console.log(`  ${name}: ${count}`);
}

console.log('Writing...');
writeFileSync(path, `${JSON.stringify(envelope)}\n`, 'utf8');
console.log('Done.');
