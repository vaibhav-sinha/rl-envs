import type { AnyTreeNode, FileEnvelope, InstanceNode } from '../model/types.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { NodeIndex } from '../engine/nodeIndex.js';
import { resolveParentNode, type GraphIndexes } from '../engine/nodeIndex.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../resolveNodeRef.js';
import { throwIfAborted } from '../mcp/inFlightAbort.js';
import { ValidationErr } from '../util/errors.js';
import {
  findAllDescendants,
  getImmediateSceneChildren,
  type TraversalOptions,
} from './findNodes.js';

/** Figma Plugin API selector types (case-insensitive). */
const SELECTOR_TYPE_ALIASES: Record<string, string[]> = {
  INSTANCE: ['INSTANCE', 'COMPONENT_INSTANCE'],
};

export type AttrOp = '=' | '*=' | '^=' | '$=';

export interface AttributeSelector {
  path: string[];
  op: AttrOp;
  value: string;
}

export interface PseudoSelector {
  name: string;
  args?: string;
}

export interface CompoundSelector {
  id?: string;
  type?: string | '*';
  attrs: AttributeSelector[];
  pseudos: PseudoSelector[];
  /** Implicit left side for selectors starting with `>`, `+`, or `~` (query scope root). */
  scopeAnchor?: boolean;
}

export type Combinator = ' ' | '>' | '+' | '~';

export interface Selector {
  compounds: CompoundSelector[];
  combinators: Combinator[];
}

export interface QueryContext {
  working: FileEnvelope;
  nodeIndex?: NodeIndex;
  graphIndexes?: GraphIndexes;
  signal?: AbortSignal;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeSelectorType(type: string): string {
  return type.toUpperCase();
}

function nodeTypeMatchesSelector(node: AnyTreeNode, selectorType: string | '*'): boolean {
  if (selectorType === '*') return true;
  const want = normalizeSelectorType(selectorType);
  const aliases = SELECTOR_TYPE_ALIASES[want];
  const actual = normalizeSelectorType(node.type);
  if (aliases) return aliases.some((t) => normalizeSelectorType(t) === actual);
  return want === actual;
}

function parseAttrPath(raw: string): string[] {
  return raw.split('.').map((p) => p.trim()).filter(Boolean);
}

function unquoteValue(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Tokenize a single selector alternative (no top-level comma). */
function tokenizeSelector(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const s = input.trim();
  const push = (t: string) => {
    if (t.length > 0) tokens.push(t);
  };
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '>' || ch === '+' || ch === '~') {
      push(ch);
      i++;
      continue;
    }
    if (ch === '#') {
      let j = i + 1;
      while (j < s.length && !/\s/.test(s[j]!) && s[j] !== '[' && s[j] !== ':' && s[j] !== '>' && s[j] !== '+' && s[j] !== '~') {
        j++;
      }
      push(s.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '[') {
      let depth = 1;
      let j = i + 1;
      while (j < s.length && depth > 0) {
        if (s[j] === '[') depth++;
        if (s[j] === ']') depth--;
        j++;
      }
      if (depth !== 0) throw new ValidationErr('VALIDATION_ERROR', 'Unclosed attribute selector');
      push(s.slice(i, j));
      i = j;
      continue;
    }
    if (ch === ':') {
      let j = i + 1;
      if (s[j] === ':') j++;
      while (j < s.length && /[a-zA-Z-]/.test(s[j]!)) j++;
      if (s[j] === '(') {
        let depth = 1;
        j++;
        while (j < s.length && depth > 0) {
          if (s[j] === '(') depth++;
          if (s[j] === ')') depth--;
          j++;
        }
      }
      push(s.slice(i, j));
      i = j;
      continue;
    }
    if (ch === '*') {
      push('*');
      i++;
      continue;
    }
    let j = i;
    while (j < s.length && /[a-zA-Z0-9_-]/.test(s[j]!)) j++;
    if (j === i) {
      throw new ValidationErr('VALIDATION_ERROR', `Invalid selector character at position ${i}`);
    }
    push(s.slice(i, j));
    i = j;
  }
  return tokens;
}

function parseCompound(tokens: string[], start: number): { compound: CompoundSelector; next: number } {
  const compound: CompoundSelector = { attrs: [], pseudos: [] };
  let i = start;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t === '>' || t === '+' || t === '~') break;
    if (t.startsWith('#')) {
      compound.id = t.slice(1);
      i++;
      continue;
    }
    if (t === '*') {
      compound.type = '*';
      i++;
      continue;
    }
    if (t.startsWith('[')) {
      const inner = t.slice(1, -1).trim();
      const attrMatch = /^([^\]=*^$]+)(\*=|\^=|\$=|=)(.+)$/.exec(inner);
      if (!attrMatch) {
        throw new ValidationErr('VALIDATION_ERROR', `Invalid attribute selector: [${inner}]`);
      }
      const [, pathRaw, op, valRaw] = attrMatch;
      compound.attrs.push({
        path: parseAttrPath(pathRaw!),
        op: op as AttrOp,
        value: unquoteValue(valRaw!),
      });
      i++;
      continue;
    }
    if (t.startsWith(':')) {
      const pseudo = t.slice(1);
      const fnMatch = /^([a-z-]+)\((.*)\)$/i.exec(pseudo);
      if (fnMatch) {
        compound.pseudos.push({ name: fnMatch[1]!.toLowerCase(), args: fnMatch[2]!.trim() });
      } else {
        compound.pseudos.push({ name: pseudo.toLowerCase() });
      }
      i++;
      continue;
    }
    if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(t) || /^[0-9]+:[0-9]+/.test(t) || /^I[0-9;:a-zA-Z-]+$/.test(t)) {
      if (/^[0-9]+:[0-9]+/.test(t) || /^I[0-9;:a-zA-Z-]+$/.test(t)) {
        compound.id = t;
      } else {
        compound.type = normalizeSelectorType(t);
      }
      i++;
      continue;
    }
    throw new ValidationErr('VALIDATION_ERROR', `Unexpected selector token: ${t}`);
  }
  return { compound, next: i };
}

function parseSelectorAlternative(input: string): Selector {
  const tokens = tokenizeSelector(input);
  if (tokens.length === 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'Empty selector');
  }
  const compounds: CompoundSelector[] = [];
  const combinators: Combinator[] = [];
  let i = 0;
  if (tokens[0] === '>' || tokens[0] === '+' || tokens[0] === '~') {
    compounds.push({ attrs: [], pseudos: [], scopeAnchor: true });
    combinators.push(tokens[0] as Combinator);
    i = 1;
  }
  while (i < tokens.length) {
    const { compound, next } = parseCompound(tokens, i);
    compounds.push(compound);
    i = next;
    if (i >= tokens.length) break;
    const comb = tokens[i];
    if (comb === '>' || comb === '+' || comb === '~') {
      combinators.push(comb);
      i++;
      continue;
    }
    combinators.push(' ');
    i++;
  }
  if (compounds.length !== combinators.length + 1) {
    throw new ValidationErr('VALIDATION_ERROR', 'Malformed selector combinators');
  }
  return { compounds, combinators };
}

export function parseSelectorList(input: string): Selector[] {
  const trimmed = input.trim();
  if (!trimmed) throw new ValidationErr('VALIDATION_ERROR', 'Empty selector');
  const parts = splitSelectorList(trimmed);
  return parts.map((p) => parseSelectorAlternative(p.trim()));
}

function splitSelectorList(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      out.push(input.slice(start, i));
      start = i + 1;
    }
  }
  out.push(input.slice(start));
  return out.filter((p) => p.trim().length > 0);
}

function getPathValue(node: AnyTreeNode, path: string[]): unknown {
  let cur: unknown = node;
  for (const key of path) {
    if (cur === undefined || cur === null) return undefined;
    if (key === '*') {
      if (!Array.isArray(cur)) return undefined;
      return cur;
    }
    if (!isRecord(cur) && typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function matchAttrValue(actual: unknown, op: AttrOp, expected: string): boolean {
  if (op === '=') {
    if (typeof actual === 'boolean') return expected === 'true' ? actual : expected === 'false' ? !actual : false;
    if (typeof actual === 'number') return Number(expected) === actual;
    return String(actual ?? '') === expected;
  }
  const s = String(actual ?? '');
  if (op === '*=') return s.includes(expected);
  if (op === '^=') return s.startsWith(expected);
  if (op === '$=') return s.endsWith(expected);
  return false;
}

function matchAttribute(node: AnyTreeNode, attr: AttributeSelector, ctx: QueryContext): boolean {
  const path = attr.path;
  if (path.length >= 2 && path[0] === 'mainComponent') {
    if (node.type !== 'INSTANCE' && node.type !== 'COMPONENT_INSTANCE') return false;
    const inst = node as InstanceNode;
    const rest = path.slice(1);
    if (rest.length === 0) return false;
    if (rest[0] === 'name') {
      const comp = findEnvelopeNode(ctx.working, inst.mainComponentId, ctx.nodeIndex);
      const name = comp?.name ?? '';
      return matchAttrValue(name, attr.op, attr.value);
    }
    return false;
  }
  if (path[0] === 'mainComponent' && path.length === 1) {
    if (node.type !== 'INSTANCE' && node.type !== 'COMPONENT_INSTANCE') return false;
    const inst = node as InstanceNode;
    const wantId =
      resolveHfcNodeIdBySourceFigmaId(ctx.working, attr.value) ??
      (findEnvelopeNode(ctx.working, attr.value, ctx.nodeIndex) ? attr.value : null);
    if (!wantId) return matchAttrValue(inst.mainComponentId, attr.op, attr.value);
    return inst.mainComponentId === wantId;
  }

  const raw = getPathValue(node, path);
  if (path.includes('*')) {
    const starIdx = path.indexOf('*');
    const prefix = path.slice(0, starIdx);
    const suffix = path.slice(starIdx + 1);
    const base = prefix.length > 0 ? getPathValue(node, prefix) : node;
    if (!Array.isArray(base)) return false;
    for (const item of base) {
      const val = suffix.length > 0 ? getPathValue(item as AnyTreeNode, suffix) : item;
      if (matchAttrValue(val, attr.op, attr.value)) return true;
    }
    return false;
  }
  return matchAttrValue(raw, attr.op, attr.value);
}

function resolveNodeId(node: AnyTreeNode, id: string, ctx: QueryContext): boolean {
  if (node.id === id) return true;
  if (node.sourceFigmaId === id) return true;
  const resolved = resolveHfcNodeIdBySourceFigmaId(ctx.working, id);
  return resolved !== null && node.id === resolved;
}

function matchCompound(node: AnyTreeNode, compound: CompoundSelector, ctx: QueryContext): boolean {
  if (compound.scopeAnchor) return true;
  if (compound.id !== undefined && !resolveNodeId(node, compound.id, ctx)) return false;
  if (compound.type !== undefined && !nodeTypeMatchesSelector(node, compound.type)) return false;
  for (const attr of compound.attrs) {
    if (!matchAttribute(node, attr, ctx)) return false;
  }
  for (const pseudo of compound.pseudos) {
    if (!matchPseudo(node, pseudo, ctx)) return false;
  }
  return true;
}

function parsePseudoArgList(args: string): string[] {
  return splitSelectorList(args).map((s) => s.trim());
}

function matchPseudo(node: AnyTreeNode, pseudo: PseudoSelector, ctx: QueryContext): boolean {
  const name = pseudo.name;
  if (name === 'first-child') {
    return isNthChild(node, 1, ctx);
  }
  if (name === 'last-child') {
    const parent = getParentInDocument(node, ctx);
    if (!parent) return false;
    const kids = getSiblings(parent, ctx);
    const visible = kids.filter((k) => (k.visible ?? true) !== false);
    return visible[visible.length - 1]?.id === node.id;
  }
  if (name === 'nth-child') {
    const n = Number(pseudo.args);
    if (!Number.isFinite(n) || n < 1) return false;
    return isNthChild(node, Math.floor(n), ctx);
  }
  if (name === 'not') {
    const inner = pseudo.args?.trim();
    if (!inner) return false;
    const alts = parseSelectorList(inner);
    return !alts.some((sel) => nodeMatchesSelector(node, sel, null, ctx));
  }
  if (name === 'is' || name === 'where') {
    const inner = pseudo.args?.trim();
    if (!inner) return false;
    const parts = parsePseudoArgList(inner);
    return parts.some((part) => {
      const type = normalizeSelectorType(part);
      if (SELECTOR_TYPE_ALIASES[type] || /^[A-Z_]+$/.test(type)) {
        return nodeTypeMatchesSelector(node, type);
      }
      const alts = parseSelectorList(part);
      return alts.some((sel) => nodeMatchesSelector(node, sel, null, ctx));
    });
  }
  return false;
}

function getParentInDocument(node: AnyTreeNode, ctx: QueryContext): AnyTreeNode | null {
  if (!ctx.graphIndexes || !node.id) return null;
  return resolveParentNode(ctx.graphIndexes, node.id);
}

function getSiblings(parent: AnyTreeNode, ctx: QueryContext): AnyTreeNode[] {
  return getImmediateSceneChildren(parent, ctx.working, ctx.nodeIndex).map((ch) =>
    findEnvelopeNode(ctx.working, ch.id, ctx.nodeIndex)
  ).filter((n): n is AnyTreeNode => n !== null);
}

function isNthChild(node: AnyTreeNode, n: number, ctx: QueryContext): boolean {
  const parent = getParentInDocument(node, ctx);
  if (!parent) return false;
  const kids = getSiblings(parent, ctx).filter((k) => (k.visible ?? true) !== false);
  const idx = kids.findIndex((k) => k.id === node.id);
  return idx === n - 1;
}

function nodeMatchesSelector(
  node: AnyTreeNode,
  selector: Selector,
  scopeRoot: AnyTreeNode | null,
  ctx: QueryContext
): boolean {
  const { compounds, combinators } = selector;
  if (compounds.length === 0) return false;
  let current: AnyTreeNode | null = node;
  for (let i = compounds.length - 1; i >= 0; i--) {
    if (!current || !matchCompound(current, compounds[i]!, ctx)) return false;
    if (i === 0) break;
    const comb = combinators[i - 1]!;
    current = findCombinatorMatch(current, comb, compounds[i - 1]!, scopeRoot, ctx);
  }
  return true;
}

function findCombinatorMatch(
  node: AnyTreeNode,
  comb: Combinator,
  leftCompound: CompoundSelector,
  scopeRoot: AnyTreeNode | null,
  ctx: QueryContext
): AnyTreeNode | null {
  if (comb === ' ') {
    let cur: AnyTreeNode | null = getParentInDocument(node, ctx);
    while (cur) {
      if (scopeRoot && cur.id === scopeRoot.id) return null;
      if (matchCompound(cur, leftCompound, ctx)) return cur;
      cur = getParentInDocument(cur, ctx);
    }
    return null;
  }
  if (comb === '>') {
    const parent = getParentInDocument(node, ctx);
    if (!parent) return null;
    if (leftCompound.scopeAnchor && scopeRoot) {
      return parent.id === scopeRoot.id ? parent : null;
    }
    return matchCompound(parent, leftCompound, ctx) ? parent : null;
  }
  const parent = getParentInDocument(node, ctx);
  if (!parent) return null;
  const siblings = getSiblings(parent, ctx);
  const idx = siblings.findIndex((s) => s.id === node.id);
  if (idx < 0) return null;
  if (comb === '+') {
    if (idx === 0) return null;
    const prev = siblings[idx - 1]!;
    return matchCompound(prev, leftCompound, ctx) ? prev : null;
  }
  if (comb === '~') {
    for (let i = idx - 1; i >= 0; i--) {
      const sib = siblings[i]!;
      if (matchCompound(sib, leftCompound, ctx)) return sib;
    }
    return null;
  }
  return null;
}

export function nodeMatches(
  node: AnyTreeNode,
  selector: string,
  ctx: QueryContext
): boolean {
  const alts = parseSelectorList(selector);
  return alts.some((sel) => nodeMatchesSelector(node, sel, null, ctx));
}

export function queryDescendants(
  container: AnyTreeNode,
  selector: string,
  ctx: QueryContext,
  options?: TraversalOptions
): AnyTreeNode[] {
  throwIfAborted(ctx.signal);
  const alts = parseSelectorList(selector);
  const descendants = findAllDescendants(container, ctx.working, {}, undefined, {
    signal: ctx.signal,
    nodeIndex: ctx.nodeIndex,
    ...options,
  });
  const out: AnyTreeNode[] = [];
  for (const node of descendants) {
    if (alts.some((sel) => nodeMatchesSelector(node, sel, container, ctx))) {
      out.push(node);
    }
  }
  return out;
}
