import { ulid } from 'ulid';
import type { EngineOperation } from '../engine/DocumentEngine.js';
import { applyEnvelopeOperation, type EnvelopeOperation } from '../engine/envelopeOps.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type {
  Effect,
  EffectBoundVariableField,
  FileEnvelope,
  LayoutGridColumns,
  LayoutGridBoundVariableField,
  Paint,
  VariableCollection,
  VariableDefinition,
  VariableResolvedValue,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import { findVariableDefinition } from './resolution.js';
import { assertRequiredModeId } from './validation.js';

export interface VariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

export interface ScriptVariableCollection {
  id: string;
  name: string;
  defaultModeId: string;
  modes: Array<{ modeId: string; name: string }>;
  variables: ScriptVariable[];
}

export interface ScriptVariable {
  id: string;
  name: string;
  resolvedType: VariableDefinition['resolvedType'];
  variableCollectionId: string;
  valuesByMode: Record<string, VariableResolvedValue>;
  aliasOfVariableId?: string;
}

export type VariableBindableNodeField =
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingTop'
  | 'paddingBottom'
  | 'itemSpacing'
  | 'fontSize'
  | 'characters'
  | 'fills'
  | 'strokes';

const FLOAT_BIND_FIELDS = new Set<VariableBindableNodeField>([
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'itemSpacing',
  'fontSize',
]);

const STRING_BIND_FIELDS = new Set<VariableBindableNodeField>(['characters']);

const PAINT_BIND_FIELDS = new Set<VariableBindableNodeField>(['fills', 'strokes']);

/** Node types that support `setBoundVariable('fills' | 'strokes', colorVariable)`. */
const GEOMETRY_PAINT_NODE_TYPES = new Set([
  'RECTANGLE',
  'ELLIPSE',
  'FRAME',
  'VECTOR',
  'LINE',
  'POLYGON',
  'STAR',
  'TEXT',
  'BOOLEAN_OPERATION',
]);

/** Whether `setBoundVariable` may be queued before the node is appended (Figma parity). */
export function canDeferSetBoundVariable(nodeType: string, field: string): boolean {
  if (PAINT_BIND_FIELDS.has(field as VariableBindableNodeField)) {
    return GEOMETRY_PAINT_NODE_TYPES.has(nodeType);
  }
  if (nodeType === 'FRAME') {
    const frameFloat = new Set([
      'width',
      'height',
      'itemSpacing',
      'paddingLeft',
      'paddingRight',
      'paddingTop',
      'paddingBottom',
      'topLeftRadius',
      'topRightRadius',
      'bottomLeftRadius',
      'bottomRightRadius',
      'minWidth',
      'maxWidth',
      'minHeight',
      'maxHeight',
      'counterAxisSpacing',
      'strokeWeight',
      'strokeTopWeight',
      'strokeRightWeight',
      'strokeBottomWeight',
      'strokeLeftWeight',
      'opacity',
      'gridRowGap',
      'gridColumnGap',
    ]);
    if (frameFloat.has(field)) return true;
    return field === 'characters';
  }
  if (nodeType === 'TEXT') {
    const textString = new Set(['fontFamily', 'fontStyle', 'characters']);
    if (textString.has(field)) return true;
    return (
      field === 'fontSize' ||
      field === 'fontWeight' ||
      field === 'letterSpacing' ||
      field === 'lineHeight' ||
      field === 'paragraphSpacing' ||
      field === 'paragraphIndent'
    );
  }
  return false;
}

function wrapCollection(
  ctx: { working: FileEnvelope; ops: EngineOperation[] },
  col: VariableCollection
): ScriptVariableCollection & { addMode: (name: string) => string } {
  const base: ScriptVariableCollection = {
    id: col.id,
    name: col.name,
    defaultModeId: col.defaultModeId,
    modes: col.modes.map((m) => ({ modeId: m.id, name: m.name })),
    variables: col.variables.map((v) => ({
      id: v.id,
      name: v.name,
      resolvedType: v.resolvedType,
      variableCollectionId: col.id,
      valuesByMode: v.valuesByMode,
      aliasOfVariableId: v.aliasOfVariableId,
    })),
  };
  return {
    ...base,
    addMode(name: string): string {
      const modeId = ulid();
      queueEnv(ctx, { op: 'createVariableMode', collectionId: col.id, modeId, name });
      const live = ctx.working.variableCollections?.find((c) => c.id === col.id);
      if (live) {
        base.modes = live.modes.map((m) => ({ modeId: m.id, name: m.name }));
      }
      return modeId;
    },
  };
}

function isVariableAliasValue(value: unknown): value is VariableAlias {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: string }).type === 'VARIABLE_ALIAS' &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'string'
  );
}

function normalizeVariableValueForMode(
  resolvedType: VariableDefinition['resolvedType'],
  value: unknown
): VariableResolvedValue {
  if (resolvedType === 'COLOR') {
    if (typeof value === 'object' && value !== null && 'type' in value && (value as VariableResolvedValue).type === 'COLOR') {
      return value as VariableResolvedValue;
    }
    if (typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value) {
      return { type: 'COLOR', color: value as { r: number; g: number; b: number } };
    }
  }
  if (resolvedType === 'FLOAT') {
    if (typeof value === 'number') return { type: 'FLOAT', value };
    if (typeof value === 'object' && value !== null && 'type' in value && (value as VariableResolvedValue).type === 'FLOAT') {
      return value as VariableResolvedValue;
    }
  }
  if (resolvedType === 'STRING') {
    if (typeof value === 'string') return { type: 'STRING', value };
    if (typeof value === 'object' && value !== null && 'type' in value && (value as VariableResolvedValue).type === 'STRING') {
      return value as VariableResolvedValue;
    }
  }
  throw new ValidationErr('VALIDATION_ERROR', `Invalid value for ${resolvedType} variable`);
}

function wrapVariable(
  ctx: { working: FileEnvelope; ops: EngineOperation[] },
  col: VariableCollection,
  v: VariableDefinition
): ScriptVariable & { setValueForMode(modeId: string, value: unknown): void } {
  const base: ScriptVariable = {
    id: v.id,
    name: v.name,
    resolvedType: v.resolvedType,
    variableCollectionId: col.id,
    valuesByMode: v.valuesByMode,
    aliasOfVariableId: v.aliasOfVariableId,
  };
  return {
    ...base,
    setValueForMode(modeId: string, value: unknown): void {
      assertRequiredModeId(modeId);
      if (isVariableAliasValue(value)) {
        queueEnv(ctx, { op: 'setVariableAliasTarget', variableId: v.id, aliasOfVariableId: value.id });
        return;
      }
      const envelopeValue = normalizeVariableValueForMode(v.resolvedType, value);
      queueEnv(ctx, { op: 'setVariableValueForMode', variableId: v.id, modeId, value: envelopeValue });
    },
  };
}

function collectionIdOf(collection: ScriptVariableCollection | { id: string }): string {
  return collection.id;
}

function queueEnv(ctx: { working: FileEnvelope; ops: EngineOperation[] }, op: EnvelopeOperation): void {
  ctx.ops.push(op);
  applyEnvelopeOperation(ctx.working, op);
}

export function createVariablesApi(ctx: { working: FileEnvelope; ops: EngineOperation[] }): Record<string, unknown> {
  const { working } = ctx;

  return {
    getLocalVariableCollectionsAsync: async (): Promise<ScriptVariableCollection[]> =>
      (working.variableCollections ?? []).map((c) => wrapCollection(ctx, c)),

    getLocalVariableCollections: (): ScriptVariableCollection[] =>
      (working.variableCollections ?? []).map((c) => wrapCollection(ctx, c)),

    getVariableCollectionByIdAsync: async (id: string): Promise<ScriptVariableCollection | null> => {
      const col = working.variableCollections?.find((c) => c.id === id);
      return col ? wrapCollection(ctx, col) : null;
    },

    getVariableCollectionById: (id: string): ScriptVariableCollection | null => {
      const col = working.variableCollections?.find((c) => c.id === id);
      return col ? wrapCollection(ctx, col) : null;
    },

    getVariableByIdAsync: async (id: string): Promise<ScriptVariable | null> => {
      const hit = findVariableDefinition(working, id);
      return hit ? wrapVariable(ctx, hit.collection, hit.variable) : null;
    },

    getVariableById: (id: string): ScriptVariable | null => {
      const hit = findVariableDefinition(working, id);
      return hit ? wrapVariable(ctx, hit.collection, hit.variable) : null;
    },

    getLocalVariablesAsync: async (
      type?: VariableDefinition['resolvedType']
    ): Promise<ScriptVariable[]> => {
      const out: ScriptVariable[] = [];
      for (const col of working.variableCollections ?? []) {
        for (const v of col.variables) {
          if (type && v.resolvedType !== type) continue;
          out.push(wrapVariable(ctx, col, v));
        }
      }
      return out;
    },

    getLocalVariables: (type?: VariableDefinition['resolvedType']): ScriptVariable[] => {
      const out: ScriptVariable[] = [];
      for (const col of working.variableCollections ?? []) {
        for (const v of col.variables) {
          if (type && v.resolvedType !== type) continue;
          out.push(wrapVariable(ctx, col, v));
        }
      }
      return out;
    },

    createVariableCollection: (name: string): ScriptVariableCollection => {
      const collectionId = ulid();
      const defaultModeId = ulid();
      queueEnv(ctx, { op: 'createVariableCollection', collectionId, name, defaultModeId });
      const col = working.variableCollections!.find((c) => c.id === collectionId)!;
      return wrapCollection(ctx, col);
    },

    createVariable: (
      name: string,
      collection: ScriptVariableCollection | { id: string },
      resolvedType: VariableDefinition['resolvedType']
    ): ScriptVariable => {
      const collectionId = collectionIdOf(collection);
      const variableId = ulid();
      queueEnv(ctx, { op: 'createVariable', collectionId, variableId, name, resolvedType });
      const hit = findVariableDefinition(working, variableId)!;
      return wrapVariable(ctx, hit.collection, hit.variable);
    },

    createVariableMode: (
      collection: ScriptVariableCollection | { id: string },
      name: string
    ): { modeId: string; name: string } => {
      const collectionId = collectionIdOf(collection);
      const modeId = ulid();
      queueEnv(ctx, { op: 'createVariableMode', collectionId, modeId, name });
      return { modeId, name };
    },

    renameVariable: (variableId: string, name: string): void => {
      queueEnv(ctx, { op: 'renameVariable', variableId, name });
    },

    deleteVariable: (variableId: string): void => {
      queueEnv(ctx, { op: 'deleteVariable', variableId });
    },

    deleteVariableCollection: (collectionId: string): void => {
      queueEnv(ctx, { op: 'deleteVariableCollection', collectionId });
    },

    setValueForMode: (variableId: string, modeId: string, value: VariableResolvedValue): void => {
      assertRequiredModeId(modeId);
      queueEnv(ctx, { op: 'setVariableValueForMode', variableId, modeId, value });
    },

    setVariableCollectionActiveMode: (collectionId: string, modeId: string): void => {
      queueEnv(ctx, { op: 'setVariableCollectionActiveMode', collectionId, modeId });
    },

    setVariableAlias: (variableId: string, aliasOfVariableId: string): void => {
      queueEnv(ctx, { op: 'setVariableAliasTarget', variableId, aliasOfVariableId });
    },

    createVariableAlias: (variable: ScriptVariable | { id: string }): VariableAlias => ({
      type: 'VARIABLE_ALIAS',
      id: variable.id,
    }),

    createVariableAliasByIdAsync: async (variableId: string): Promise<VariableAlias> => ({
      type: 'VARIABLE_ALIAS',
      id: variableId,
    }),

    setBoundVariableForPaint: (
      paint: { type: 'SOLID'; color: { r: number; g: number; b: number }; visible?: boolean; opacity?: number },
      _field: 'color',
      variable: ScriptVariable | { id: string } | null
    ): Paint => {
      if (variable === null) return paint;
      const hit = findVariableDefinition(working, variable.id);
      if (!hit || hit.variable.resolvedType !== 'COLOR') {
        throw new ValidationErr('VALIDATION_ERROR', 'setBoundVariableForPaint requires COLOR variable');
      }
      return { type: 'VARIABLE_COLOR', variableId: variable.id, visible: paint.visible, opacity: paint.opacity };
    },

    setBoundVariableForEffect: (
      effect: Effect,
      field: EffectBoundVariableField,
      variable: ScriptVariable | { id: string } | null
    ): Effect => {
      const next = structuredClone(effect) as Effect & {
        boundVariables?: Partial<Record<EffectBoundVariableField, { type: 'VARIABLE_ALIAS'; id: string }>>;
      };
      const bv = { ...(next.boundVariables ?? {}) };
      if (variable === null) {
        delete bv[field];
      } else {
        const hit = findVariableDefinition(working, variable.id);
        if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${variable.id}`);
        if (field === 'color') {
          if (hit.variable.resolvedType !== 'COLOR') {
            throw new ValidationErr('VALIDATION_ERROR', 'Effect color binding requires COLOR variable');
          }
        } else if (hit.variable.resolvedType !== 'FLOAT') {
          throw new ValidationErr('VALIDATION_ERROR', `Effect ${field} binding requires FLOAT variable`);
        }
        bv[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
      }
      next.boundVariables = Object.keys(bv).length ? bv : undefined;
      return next;
    },

    setBoundVariableForLayoutGrid: (
      layoutGrid: LayoutGridColumns,
      field: LayoutGridBoundVariableField,
      variable: ScriptVariable | { id: string } | null
    ): LayoutGridColumns => {
      const next = structuredClone(layoutGrid) as LayoutGridColumns & {
        boundVariables?: LayoutGridColumns['boundVariables'];
      };
      const bv = { ...(next.boundVariables ?? {}) };
      if (variable === null) {
        delete bv[field];
      } else {
        const hit = findVariableDefinition(working, variable.id);
        if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${variable.id}`);
        if (hit.variable.resolvedType !== 'FLOAT') {
          throw new ValidationErr('VALIDATION_ERROR', `Layout grid ${field} binding requires FLOAT variable`);
        }
        bv[field] = { type: 'VARIABLE_ALIAS', id: variable.id };
      }
      next.boundVariables = Object.keys(bv).length ? bv : undefined;
      return next;
    },

    importVariableByKeyAsync: async (): Promise<never> => {
      throw new ValidationErr(
        'UNSUPPORTED_OPERATION',
        'importVariableByKeyAsync is not supported (no Figma cloud team libraries in headless-figma-clone)'
      );
    },

    extendLibraryCollectionByKeyAsync: async (): Promise<never> => {
      throw new ValidationErr(
        'UNSUPPORTED_OPERATION',
        'extendLibraryCollectionByKeyAsync is not supported in headless-figma-clone'
      );
    },
  };
}

/** Build an `updateNode` patch binding or unbinding a variable on a supported node field. */
export function bindVariableToNodeField(
  working: FileEnvelope,
  nodeId: string,
  field: VariableBindableNodeField,
  variable: ScriptVariable | { id: string } | null
): Record<string, unknown> {
  const live = findEnvelopeNode(working, nodeId);
  if (!live) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);

  if (PAINT_BIND_FIELDS.has(field)) {
    if (!GEOMETRY_PAINT_NODE_TYPES.has(live.type)) {
      throw new ValidationErr(
        'VALIDATION_ERROR',
        `Node type ${live.type} does not support setBoundVariable for ${field}`
      );
    }
    if (variable === null) {
      return { [field]: undefined };
    }
    const hit = findVariableDefinition(working, variable.id);
    if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${variable.id}`);
    if (hit.variable.resolvedType !== 'COLOR') {
      throw new ValidationErr('VALIDATION_ERROR', `Field ${field} requires COLOR variable`);
    }
    return {
      [field]: [{ type: 'VARIABLE_COLOR', variableId: variable.id, visible: true } satisfies Paint],
    };
  }

  if (variable === null) {
    if (live.type !== 'FRAME' && live.type !== 'TEXT') {
      throw new ValidationErr('VALIDATION_ERROR', `Node type ${live.type} does not support boundVariables`);
    }
    const bv = { ...(live.boundVariables ?? {}) };
    delete bv[field as keyof typeof bv];
    return { boundVariables: Object.keys(bv).length ? bv : undefined };
  }

  const hit = findVariableDefinition(working, variable.id);
  if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${variable.id}`);

  if (FLOAT_BIND_FIELDS.has(field) && hit.variable.resolvedType !== 'FLOAT') {
    throw new ValidationErr('VALIDATION_ERROR', `Field ${field} requires FLOAT variable`);
  }
  if (STRING_BIND_FIELDS.has(field) && hit.variable.resolvedType !== 'STRING') {
    throw new ValidationErr('VALIDATION_ERROR', `Field ${field} requires STRING variable`);
  }
  if (live.type === 'FRAME' && STRING_BIND_FIELDS.has(field)) {
    throw new ValidationErr('VALIDATION_ERROR', `FRAME cannot bind field ${field}`);
  }
  if (live.type === 'TEXT') {
    const textFloat = new Set([
      'fontSize',
      'fontWeight',
      'letterSpacing',
      'lineHeight',
      'paragraphSpacing',
      'paragraphIndent',
    ]);
    const textString = new Set(['fontFamily', 'fontStyle', 'characters']);
    if (textFloat.has(field) && hit.variable.resolvedType !== 'FLOAT') {
      throw new ValidationErr('VALIDATION_ERROR', `Field ${field} requires FLOAT variable`);
    }
    if (textString.has(field) && hit.variable.resolvedType !== 'STRING') {
      throw new ValidationErr('VALIDATION_ERROR', `Field ${field} requires STRING variable`);
    }
    if (!textFloat.has(field) && !textString.has(field) && !PAINT_BIND_FIELDS.has(field)) {
      throw new ValidationErr('VALIDATION_ERROR', `TEXT cannot bind field ${field}`);
    }
  }
  if (live.type !== 'FRAME' && live.type !== 'TEXT') {
    throw new ValidationErr('VALIDATION_ERROR', `Node type ${live.type} does not support boundVariables`);
  }

  const bv: Record<string, string> = {
    ...((live as { boundVariables?: Record<string, string> }).boundVariables ?? {}),
  };
  bv[field] = variable.id;
  return { boundVariables: bv };
}
