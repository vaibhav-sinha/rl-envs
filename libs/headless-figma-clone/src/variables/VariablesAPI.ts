import { ulid } from 'ulid';
import type { EngineOperation } from '../engine/DocumentEngine.js';
import { applyEnvelopeOperation, type EnvelopeOperation } from '../engine/envelopeOps.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { FileEnvelope, Paint, VariableCollection, VariableDefinition, VariableResolvedValue } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import { findVariableDefinition } from './resolution.js';

export interface VariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

export interface ScriptVariableCollection {
  id: string;
  name: string;
  defaultModeId: string;
  modes: Array<{ id: string; name: string }>;
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
  | 'characters';

const FLOAT_BIND_FIELDS = new Set<VariableBindableNodeField>([
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'itemSpacing',
  'fontSize',
]);

const STRING_BIND_FIELDS = new Set<VariableBindableNodeField>(['characters']);

function wrapCollection(col: VariableCollection): ScriptVariableCollection {
  return {
    id: col.id,
    name: col.name,
    defaultModeId: col.defaultModeId,
    modes: col.modes.map((m) => ({ id: m.id, name: m.name })),
    variables: col.variables.map((v) => ({
      id: v.id,
      name: v.name,
      resolvedType: v.resolvedType,
      variableCollectionId: col.id,
      valuesByMode: v.valuesByMode,
      aliasOfVariableId: v.aliasOfVariableId,
    })),
  };
}

function wrapVariable(col: VariableCollection, v: VariableDefinition): ScriptVariable {
  return {
    id: v.id,
    name: v.name,
    resolvedType: v.resolvedType,
    variableCollectionId: col.id,
    valuesByMode: v.valuesByMode,
    aliasOfVariableId: v.aliasOfVariableId,
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
      (working.variableCollections ?? []).map(wrapCollection),

    getLocalVariableCollections: (): ScriptVariableCollection[] =>
      (working.variableCollections ?? []).map(wrapCollection),

    getVariableCollectionByIdAsync: async (id: string): Promise<ScriptVariableCollection | null> => {
      const col = working.variableCollections?.find((c) => c.id === id);
      return col ? wrapCollection(col) : null;
    },

    getVariableCollectionById: (id: string): ScriptVariableCollection | null => {
      const col = working.variableCollections?.find((c) => c.id === id);
      return col ? wrapCollection(col) : null;
    },

    getVariableByIdAsync: async (id: string): Promise<ScriptVariable | null> => {
      const hit = findVariableDefinition(working, id);
      return hit ? wrapVariable(hit.collection, hit.variable) : null;
    },

    getVariableById: (id: string): ScriptVariable | null => {
      const hit = findVariableDefinition(working, id);
      return hit ? wrapVariable(hit.collection, hit.variable) : null;
    },

    getLocalVariablesAsync: async (
      type?: VariableDefinition['resolvedType']
    ): Promise<ScriptVariable[]> => {
      const out: ScriptVariable[] = [];
      for (const col of working.variableCollections ?? []) {
        for (const v of col.variables) {
          if (type && v.resolvedType !== type) continue;
          out.push(wrapVariable(col, v));
        }
      }
      return out;
    },

    getLocalVariables: (type?: VariableDefinition['resolvedType']): ScriptVariable[] => {
      const out: ScriptVariable[] = [];
      for (const col of working.variableCollections ?? []) {
        for (const v of col.variables) {
          if (type && v.resolvedType !== type) continue;
          out.push(wrapVariable(col, v));
        }
      }
      return out;
    },

    createVariableCollection: (name: string): ScriptVariableCollection => {
      const collectionId = ulid();
      const defaultModeId = ulid();
      queueEnv(ctx, { op: 'createVariableCollection', collectionId, name, defaultModeId });
      return wrapCollection(working.variableCollections!.find((c) => c.id === collectionId)!);
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
      return wrapVariable(hit.collection, hit.variable);
    },

    createVariableMode: (
      collection: ScriptVariableCollection | { id: string },
      name: string
    ): { id: string; name: string } => {
      const collectionId = collectionIdOf(collection);
      const modeId = ulid();
      queueEnv(ctx, { op: 'createVariableMode', collectionId, modeId, name });
      return { id: modeId, name };
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

    setBoundVariableForEffect: (): never => {
      throw new ValidationErr('UNSUPPORTED_OPERATION', 'setBoundVariableForEffect is not implemented in headless-figma-clone');
    },

    setBoundVariableForLayoutGrid: (): never => {
      throw new ValidationErr('UNSUPPORTED_OPERATION', 'setBoundVariableForLayoutGrid is not implemented in headless-figma-clone');
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
  if (live.type === 'TEXT' && field !== 'fontSize' && field !== 'characters') {
    throw new ValidationErr('VALIDATION_ERROR', `TEXT cannot bind field ${field}`);
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
