import type {
  Effect,
  FileEnvelope,
  LayoutGridColumns,
  Paint,
  FrameNode,
  SceneNode,
  TextStyleDefinition,
  VariableCollection,
  VariableDefinition,
  VariableResolvedValue,
} from '../model/types.js';
import { assertRequiredModeId } from '../variables/validation.js';
import { ValidationErr } from '../util/errors.js';
import { findVariableDefinition } from '../variables/resolution.js';
import { validateEffects } from './validateEffects.js';
import { validatePaintArray } from './validatePaints.js';

/** Ops that mutate {@link FileEnvelope} design tokens / local styles (not scene graph). */
export type EnvelopeOperation =
  | { op: 'createVariableCollection'; collectionId: string; name: string; defaultModeId: string }
  | { op: 'createVariableMode'; collectionId: string; modeId: string; name: string }
  | { op: 'createVariable'; collectionId: string; variableId: string; name: string; resolvedType: VariableDefinition['resolvedType'] }
  | { op: 'renameVariable'; variableId: string; name: string }
  | { op: 'deleteVariable'; variableId: string }
  | { op: 'deleteVariableCollection'; collectionId: string }
  | { op: 'setVariableValueForMode'; variableId: string; modeId: string; value: VariableResolvedValue }
  | { op: 'setVariableCollectionActiveMode'; collectionId: string; modeId: string }
  | { op: 'setVariableAliasTarget'; variableId: string; aliasOfVariableId: string | null }
  | { op: 'createPaintStyle'; id: string; name: string; paints: Paint[] }
  | { op: 'createTextStyle'; id: string; name: string; spec?: Partial<TextStyleDefinition> }
  | { op: 'createEffectStyle'; id: string; name: string; effects: Effect[] }
  | { op: 'createGridStyle'; id: string; name: string; layoutGrids: LayoutGridColumns[] }
  | { op: 'movePaintStyleAfter'; targetId: string; afterId: string | null }
  | { op: 'moveTextStyleAfter'; targetId: string; afterId: string | null }
  | { op: 'moveEffectStyleAfter'; targetId: string; afterId: string | null }
  | { op: 'moveGridStyleAfter'; targetId: string; afterId: string | null }
  | { op: 'updatePaintStyle'; id: string; patch: { name?: string; paints?: Paint[] } }
  | { op: 'updateTextStyle'; id: string; patch: { name?: string; fontSize?: number; fontWeight?: number; fills?: Paint[] } }
  | { op: 'updateEffectStyle'; id: string; patch: { name?: string; effects?: Effect[] } }
  | { op: 'updateGridStyle'; id: string; patch: { name?: string; layoutGrids?: LayoutGridColumns[] } };

const ENVELOPE_OP_SET = new Set<EnvelopeOperation['op']>([
  'createVariableCollection',
  'createVariableMode',
  'createVariable',
  'renameVariable',
  'deleteVariable',
  'deleteVariableCollection',
  'setVariableValueForMode',
  'setVariableCollectionActiveMode',
  'setVariableAliasTarget',
  'createPaintStyle',
  'createTextStyle',
  'createEffectStyle',
  'createGridStyle',
  'movePaintStyleAfter',
  'moveTextStyleAfter',
  'moveEffectStyleAfter',
  'moveGridStyleAfter',
  'updatePaintStyle',
  'updateTextStyle',
  'updateEffectStyle',
  'updateGridStyle',
]);

export function isEnvelopeOperation(op: { op: string }): op is EnvelopeOperation {
  return ENVELOPE_OP_SET.has(op.op as EnvelopeOperation['op']);
}

function ensureCollections(env: FileEnvelope): VariableCollection[] {
  if (!env.variableCollections) env.variableCollections = [];
  return env.variableCollections;
}

function defaultValueForType(t: VariableDefinition['resolvedType']): VariableResolvedValue {
  if (t === 'COLOR') return { type: 'COLOR', color: { r: 0, g: 0, b: 0 } };
  if (t === 'FLOAT') return { type: 'FLOAT', value: 0 };
  return { type: 'STRING', value: '' };
}

function validateResolvedValue(
  t: VariableDefinition['resolvedType'],
  v: VariableResolvedValue,
  label: string
): void {
  if (v.type === 'COLOR') {
    if (t !== 'COLOR') throw new ValidationErr('VALIDATION_ERROR', `${label}: value type COLOR incompatible with variable type ${t}`);
    for (const k of ['r', 'g', 'b'] as const) {
      const n = v.color[k];
      if (typeof n !== 'number' || n < 0 || n > 1) {
        throw new ValidationErr('VALIDATION_ERROR', `${label}: color.${k} must be 0..1`);
      }
    }
    return;
  }
  if (v.type === 'FLOAT') {
    if (t !== 'FLOAT') throw new ValidationErr('VALIDATION_ERROR', `${label}: value type FLOAT incompatible with variable type ${t}`);
    if (typeof v.value !== 'number' || !Number.isFinite(v.value)) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: FLOAT.value must be finite number`);
    }
    return;
  }
  if (v.type === 'STRING') {
    if (t !== 'STRING') throw new ValidationErr('VALIDATION_ERROR', `${label}: value type STRING incompatible with variable type ${t}`);
    if (typeof v.value !== 'string') throw new ValidationErr('VALIDATION_ERROR', `${label}: STRING.value must be string`);
  }
}

function collectVariableReferences(env: FileEnvelope, variableId: string): string[] {
  const reasons: string[] = [];
  const walkPaint = (paints: Paint[] | undefined, label: string): void => {
    for (const p of paints ?? []) {
      if (p.type === 'VARIABLE_COLOR' && p.variableId === variableId) {
        reasons.push(`${label}:VARIABLE_COLOR`);
      }
    }
  };
  const walkNodes = (nodes: SceneNode[]): void => {
    for (const n of nodes) {
      if ('boundVariables' in n && n.boundVariables) {
        for (const [k, vid] of Object.entries(n.boundVariables)) {
          if (vid === variableId) reasons.push(`node:${n.id}:boundVariables.${k}`);
        }
      }
      if (n.type === 'FRAME' || n.type === 'SECTION' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP') {
        walkNodes(n.children);
      }
      if (n.type === 'BOOLEAN_OPERATION') walkNodes(n.children as SceneNode[]);
      if ('fills' in n) walkPaint(n.fills, `node:${n.id}:fills`);
      if ('backgrounds' in n) walkPaint((n as FrameNode).backgrounds, `node:${n.id}:backgrounds`);
      if ('strokes' in n) walkPaint((n as { strokes?: Paint[] }).strokes, `node:${n.id}:strokes`);
      if (n.type === 'TEXT' && n.styledSegments) {
        for (const seg of n.styledSegments) {
          walkPaint(seg.style.fills, `node:${n.id}:styledSegment`);
        }
      }
    }
  };
  for (const p of env.document.children) {
    if (p.type === 'PAGE') {
      walkPaint(p.backgrounds, `node:${p.id}:backgrounds`);
      walkNodes(p.children);
    }
  }
  for (const col of env.variableCollections ?? []) {
    for (const v of col.variables) {
      if (v.aliasOfVariableId === variableId) reasons.push(`alias:${v.id}`);
    }
  }
  return reasons;
}

function styleFolderKey(name: string): string {
  const i = name.lastIndexOf('/');
  return i < 0 ? '' : name.slice(0, i);
}

function moveIdAfter<T extends { id: string; name: string }>(arr: T[], targetId: string, afterId: string | null): void {
  const ti = arr.findIndex((x) => x.id === targetId);
  if (ti < 0) throw new ValidationErr('VALIDATION_ERROR', `Unknown style id ${targetId}`);
  const target = arr[ti]!;
  const fk = styleFolderKey(target.name);
  if (afterId !== null) {
    const ri = arr.findIndex((x) => x.id === afterId);
    if (ri < 0) throw new ValidationErr('VALIDATION_ERROR', `Unknown reference style id ${afterId}`);
    const ref = arr[ri]!;
    if (styleFolderKey(ref.name) !== fk) {
      throw new ValidationErr('VALIDATION_ERROR', 'moveLocal*StyleAfter: target and reference must be in the same folder (name prefix before last /)');
    }
  }
  arr.splice(ti, 1);
  if (afterId === null) {
    const ins = arr.findIndex((x) => styleFolderKey(x.name) === fk);
    arr.splice(ins >= 0 ? ins : 0, 0, target);
    return;
  }
  const newRi = arr.findIndex((x) => x.id === afterId);
  if (newRi < 0) throw new ValidationErr('VALIDATION_ERROR', `Unknown reference style id ${afterId}`);
  arr.splice(newRi + 1, 0, target);
}

export function applyEnvelopeOperation(working: FileEnvelope, op: EnvelopeOperation): void {
  if (op.op === 'createVariableCollection') {
    const cols = ensureCollections(working);
    if (cols.some((c) => c.id === op.collectionId)) {
      return;
    }
    cols.push({
      id: op.collectionId,
      name: op.name,
      defaultModeId: op.defaultModeId,
      modes: [{ id: op.defaultModeId, name: 'Mode 1' }],
      variables: [],
    });
    if (!working.activeModeByCollectionId) working.activeModeByCollectionId = {};
    working.activeModeByCollectionId[op.collectionId] = op.defaultModeId;
    return;
  }
  if (op.op === 'createVariableMode') {
    const col = ensureCollections(working).find((c) => c.id === op.collectionId);
    if (!col) throw new ValidationErr('VALIDATION_ERROR', `Unknown collection ${op.collectionId}`);
    if (col.modes.some((m) => m.id === op.modeId)) {
      throw new ValidationErr('VALIDATION_ERROR', `Duplicate mode id ${op.modeId}`);
    }
    col.modes.push({ id: op.modeId, name: op.name });
    for (const v of col.variables) {
      if (v.aliasOfVariableId) continue;
      if (v.valuesByMode[op.modeId] === undefined) {
        v.valuesByMode[op.modeId] = defaultValueForType(v.resolvedType);
      }
    }
    return;
  }
  if (op.op === 'createVariable') {
    const col = ensureCollections(working).find((c) => c.id === op.collectionId);
    if (!col) throw new ValidationErr('VALIDATION_ERROR', `Unknown collection ${op.collectionId}`);
    if (col.variables.some((v) => v.id === op.variableId)) {
      throw new ValidationErr('VALIDATION_ERROR', `Duplicate variable id ${op.variableId}`);
    }
    const valuesByMode: Record<string, VariableResolvedValue> = {};
    const def = defaultValueForType(op.resolvedType);
    for (const m of col.modes) {
      valuesByMode[m.id] = def;
    }
    col.variables.push({
      id: op.variableId,
      name: op.name,
      resolvedType: op.resolvedType,
      valuesByMode,
    });
    return;
  }
  if (op.op === 'renameVariable') {
    const hit = findVariableDefinition(working, op.variableId);
    if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${op.variableId}`);
    hit.variable.name = op.name;
    return;
  }
  if (op.op === 'deleteVariable') {
    const hit = findVariableDefinition(working, op.variableId);
    if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${op.variableId}`);
    const refs = collectVariableReferences(working, op.variableId);
    if (refs.length) {
      throw new ValidationErr('VALIDATION_ERROR', `Cannot delete variable ${op.variableId}: in use (${refs.slice(0, 5).join('; ')})`);
    }
    hit.collection.variables = hit.collection.variables.filter((v) => v.id !== op.variableId);
    return;
  }
  if (op.op === 'deleteVariableCollection') {
    const cols = ensureCollections(working);
    const col = cols.find((c) => c.id === op.collectionId);
    if (!col) throw new ValidationErr('VALIDATION_ERROR', `Unknown collection ${op.collectionId}`);
    for (const v of col.variables) {
      const refs = collectVariableReferences(working, v.id);
      if (refs.length) {
        throw new ValidationErr('VALIDATION_ERROR', `Cannot delete collection ${op.collectionId}: variable ${v.id} in use`);
      }
    }
    working.variableCollections = cols.filter((c) => c.id !== op.collectionId);
    if (working.activeModeByCollectionId) delete working.activeModeByCollectionId[op.collectionId];
    return;
  }
  if (op.op === 'setVariableValueForMode') {
    assertRequiredModeId(op.modeId);
    const hit = findVariableDefinition(working, op.variableId);
    if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${op.variableId}`);
    if (hit.variable.aliasOfVariableId) {
      throw new ValidationErr('VALIDATION_ERROR', `Cannot set values on alias variable ${op.variableId}`);
    }
    if (!hit.collection.modes.some((m) => m.id === op.modeId)) {
      throw new ValidationErr('VALIDATION_ERROR', `Unknown mode ${op.modeId} in collection ${hit.collection.id}`);
    }
    validateResolvedValue(hit.variable.resolvedType, op.value, 'setVariableValueForMode');
    hit.variable.valuesByMode[op.modeId] = op.value;
    return;
  }
  if (op.op === 'setVariableCollectionActiveMode') {
    const col = ensureCollections(working).find((c) => c.id === op.collectionId);
    if (!col) throw new ValidationErr('VALIDATION_ERROR', `Unknown collection ${op.collectionId}`);
    if (!col.modes.some((m) => m.id === op.modeId)) {
      throw new ValidationErr('VALIDATION_ERROR', `Unknown mode ${op.modeId}`);
    }
    if (!working.activeModeByCollectionId) working.activeModeByCollectionId = {};
    working.activeModeByCollectionId[op.collectionId] = op.modeId;
    return;
  }
  if (op.op === 'setVariableAliasTarget') {
    const hit = findVariableDefinition(working, op.variableId);
    if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${op.variableId}`);
    if (op.aliasOfVariableId === null) {
      delete hit.variable.aliasOfVariableId;
      if (Object.keys(hit.variable.valuesByMode).length === 0) {
        const def = defaultValueForType(hit.variable.resolvedType);
        for (const m of hit.collection.modes) {
          hit.variable.valuesByMode[m.id] = def;
        }
      }
      return;
    }
    const target = findVariableDefinition(working, op.aliasOfVariableId);
    if (!target) throw new ValidationErr('VALIDATION_ERROR', `Unknown alias target variable ${op.aliasOfVariableId}`);
    if (target.variable.resolvedType !== hit.variable.resolvedType) {
      throw new ValidationErr('VALIDATION_ERROR', 'Alias target resolvedType must match source variable');
    }
    if (op.aliasOfVariableId === op.variableId) {
      throw new ValidationErr('VALIDATION_ERROR', 'Variable cannot alias itself');
    }
    hit.variable.aliasOfVariableId = op.aliasOfVariableId;
    hit.variable.valuesByMode = {};
    return;
  }
  if (op.op === 'createPaintStyle') {
    if (!working.paintStyles) working.paintStyles = [];
    if (working.paintStyles.some((s) => s.id === op.id)) return;
    validatePaintArray(op.paints, 'paintStyle.paints', working);
    working.paintStyles.push({ id: op.id, name: op.name, paints: op.paints });
    return;
  }
  if (op.op === 'createTextStyle') {
    if (!working.textStyles) working.textStyles = [];
    if (working.textStyles.some((s) => s.id === op.id)) return;
    const spec = op.spec ?? {};
    working.textStyles.push({
      id: op.id,
      name: op.name,
      fontSize: spec.fontSize ?? 12,
      fontWeight: spec.fontWeight ?? 400,
      fills: spec.fills,
    });
    return;
  }
  if (op.op === 'createEffectStyle') {
    if (!working.effectStyles) working.effectStyles = [];
    if (working.effectStyles.some((s) => s.id === op.id)) return;
    const eff = validateEffects(op.effects, 'effectStyle.effects') ?? [];
    working.effectStyles.push({ id: op.id, name: op.name, effects: eff });
    return;
  }
  if (op.op === 'createGridStyle') {
    if (!working.gridStyles) working.gridStyles = [];
    if (working.gridStyles.some((s) => s.id === op.id)) return;
    working.gridStyles.push({ id: op.id, name: op.name, layoutGrids: op.layoutGrids });
    return;
  }
  if (op.op === 'movePaintStyleAfter') {
    if (!working.paintStyles?.length) throw new ValidationErr('VALIDATION_ERROR', 'No paint styles');
    moveIdAfter(working.paintStyles, op.targetId, op.afterId);
    return;
  }
  if (op.op === 'moveTextStyleAfter') {
    if (!working.textStyles?.length) throw new ValidationErr('VALIDATION_ERROR', 'No text styles');
    moveIdAfter(working.textStyles, op.targetId, op.afterId);
    return;
  }
  if (op.op === 'moveEffectStyleAfter') {
    if (!working.effectStyles?.length) throw new ValidationErr('VALIDATION_ERROR', 'No effect styles');
    moveIdAfter(working.effectStyles, op.targetId, op.afterId);
    return;
  }
  if (op.op === 'moveGridStyleAfter') {
    if (!working.gridStyles?.length) throw new ValidationErr('VALIDATION_ERROR', 'No grid styles');
    moveIdAfter(working.gridStyles, op.targetId, op.afterId);
    return;
  }
  if (op.op === 'updatePaintStyle') {
    const s = working.paintStyles?.find((x) => x.id === op.id);
    if (!s) throw new ValidationErr('VALIDATION_ERROR', `Unknown paint style ${op.id}`);
    if (op.patch.name !== undefined) s.name = op.patch.name;
    if (op.patch.paints !== undefined) {
      s.paints = validatePaintArray(op.patch.paints, 'paintStyle.paints', working) ?? [];
    }
    return;
  }
  if (op.op === 'updateTextStyle') {
    const s = working.textStyles?.find((x) => x.id === op.id);
    if (!s) throw new ValidationErr('VALIDATION_ERROR', `Unknown text style ${op.id}`);
    if (op.patch.name !== undefined) s.name = op.patch.name;
    if (op.patch.fontSize !== undefined) s.fontSize = op.patch.fontSize;
    if (op.patch.fontWeight !== undefined) s.fontWeight = op.patch.fontWeight;
    if (op.patch.fills !== undefined) s.fills = validatePaintArray(op.patch.fills, 'textStyle.fills', working);
    return;
  }
  if (op.op === 'updateEffectStyle') {
    const s = working.effectStyles?.find((x) => x.id === op.id);
    if (!s) throw new ValidationErr('VALIDATION_ERROR', `Unknown effect style ${op.id}`);
    if (op.patch.name !== undefined) s.name = op.patch.name;
    if (op.patch.effects !== undefined) {
      s.effects = validateEffects(op.patch.effects, 'effectStyle.effects') ?? [];
    }
    return;
  }
  if (op.op === 'updateGridStyle') {
    const s = working.gridStyles?.find((x) => x.id === op.id);
    if (!s) throw new ValidationErr('VALIDATION_ERROR', `Unknown grid style ${op.id}`);
    if (op.patch.name !== undefined) s.name = op.patch.name;
    if (op.patch.layoutGrids !== undefined) s.layoutGrids = op.patch.layoutGrids;
    return;
  }
}
