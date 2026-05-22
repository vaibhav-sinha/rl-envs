import type { FileEnvelope } from '../model/types.js';

export type DesignSystemHitKind = 'variable' | 'textStyle' | 'paintStyle' | 'effectStyle' | 'gridStyle' | 'component';

export interface DesignSystemHit {
  kind: DesignSystemHitKind;
  id: string;
  name: string;
  score: number;
  collectionId?: string;
  /** For variables: COLOR | FLOAT | STRING */
  variableType?: string;
}

function scoreForMatch(name: string, qLower: string): number {
  const n = name.toLowerCase();
  if (qLower === '') return 0;
  if (n === qLower) return 1_000_000;
  if (n.startsWith(qLower)) return 800_000 + qLower.length * 100;
  const idx = n.indexOf(qLower);
  if (idx < 0) return 0;
  return 500_000 + qLower.length * 100 - idx;
}

const KIND_ORDER: Record<DesignSystemHitKind, number> = {
  variable: 0,
  textStyle: 1,
  paintStyle: 2,
  effectStyle: 3,
  gridStyle: 4,
  component: 5,
};

function compareHits(a: DesignSystemHit, b: DesignSystemHit): number {
  if (b.score !== a.score) return b.score - a.score;
  const ko = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (ko !== 0) return ko;
  const idc = a.id.localeCompare(b.id);
  if (idc !== 0) return idc;
  return a.name.localeCompare(b.name);
}

/**
 * Deterministic ranked search (NFR-TEST-003): tie-break by kind, id, then name.
 * Empty `query`: returns up to `limit` items sorted by kind, id (stable catalog slice).
 */
export function searchDesignSystem(env: FileEnvelope, query: string, limit: number): DesignSystemHit[] {
  const lim = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 20;
  const qLower = query.trim().toLowerCase();
  const hits: DesignSystemHit[] = [];

  for (const col of env.variableCollections ?? []) {
    for (const v of col.variables) {
      const sc = qLower === '' ? 1 : scoreForMatch(v.name, qLower);
      if (sc <= 0 && qLower !== '') continue;
      hits.push({
        kind: 'variable',
        id: v.id,
        name: v.name,
        score: sc,
        collectionId: col.id,
        variableType: v.resolvedType,
      });
    }
  }
  for (const s of env.textStyles ?? []) {
    const sc = qLower === '' ? 1 : scoreForMatch(s.name, qLower);
    if (sc <= 0 && qLower !== '') continue;
    hits.push({ kind: 'textStyle', id: s.id, name: s.name, score: sc });
  }
  for (const s of env.paintStyles ?? []) {
    const sc = qLower === '' ? 1 : scoreForMatch(s.name, qLower);
    if (sc <= 0 && qLower !== '') continue;
    hits.push({ kind: 'paintStyle', id: s.id, name: s.name, score: sc });
  }
  for (const s of env.effectStyles ?? []) {
    const sc = qLower === '' ? 1 : scoreForMatch(s.name, qLower);
    if (sc <= 0 && qLower !== '') continue;
    hits.push({ kind: 'effectStyle', id: s.id, name: s.name, score: sc });
  }
  for (const s of env.gridStyles ?? []) {
    const sc = qLower === '' ? 1 : scoreForMatch(s.name, qLower);
    if (sc <= 0 && qLower !== '') continue;
    hits.push({ kind: 'gridStyle', id: s.id, name: s.name, score: sc });
  }
  // Phase 9: components can live either in legacy `env.components[]` or as `COMPONENT` nodes
  // in the scene graph. We index both.
  for (const c of env.components ?? []) {
    const sc = qLower === '' ? 1 : scoreForMatch(c.name, qLower);
    if (sc <= 0 && qLower !== '') continue;
    hits.push({ kind: 'component', id: c.id, name: c.name, score: sc });
  }

  function walkSceneNodes(nodes: any[]): void {
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      if (n.type === 'COMPONENT' && typeof n.name === 'string' && typeof n.id === 'string') {
        const sc = qLower === '' ? 1 : scoreForMatch(n.name, qLower);
        if (sc > 0 || qLower === '') {
          if (!(hits as unknown as any[]).some((h) => h.kind === 'component' && h.id === n.id)) {
            hits.push({ kind: 'component', id: n.id, name: n.name, score: sc });
          }
        }
      }
      if (Array.isArray(n.children)) {
        // Only recurse into known container node types (keep it cheap/deterministic).
        if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
          walkSceneNodes(n.children as any[]);
        } else if (n.type === 'BOOLEAN_OPERATION') {
          walkSceneNodes(n.children as any[]);
        }
      }
    }
  }

  for (const p of env.document.children) {
    walkSceneNodes(p.children as unknown as any[]);
  }

  hits.sort(compareHits);
  if (hits.length === 0 && qLower !== '') {
    return searchDesignSystem(env, '', limit);
  }
  return hits.slice(0, lim);
}
