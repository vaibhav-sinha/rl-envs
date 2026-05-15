import type {
  FileEnvelope,
  RGB,
  VariableCollection,
  VariableDefinition,
  VariableResolvedValue,
} from '../model/types.js';

export function cssVarNameForVariable(variableId: string): string {
  return `--hfc-var-${variableId}`;
}

export function activeModeIdForCollection(env: FileEnvelope, col: VariableCollection): string {
  const o = env.activeModeByCollectionId?.[col.id];
  if (o && col.modes.some((m) => m.id === o)) return o;
  return col.defaultModeId;
}

export function findVariableDefinition(
  env: FileEnvelope,
  variableId: string
): { collection: VariableCollection; variable: VariableDefinition } | null {
  for (const col of env.variableCollections ?? []) {
    const v = col.variables.find((x) => x.id === variableId);
    if (v) return { collection: col, variable: v };
  }
  return null;
}

export function resolveVariableValue(
  env: FileEnvelope,
  variableId: string
): VariableResolvedValue | null {
  const hit = findVariableDefinition(env, variableId);
  if (!hit) return null;
  const modeId = activeModeIdForCollection(env, hit.collection);
  return hit.variable.valuesByMode[modeId] ?? null;
}

export function resolveVariableToRgb(env: FileEnvelope, variableId: string): RGB | null {
  const hit = findVariableDefinition(env, variableId);
  if (!hit || hit.variable.resolvedType !== 'COLOR') return null;
  const val = resolveVariableValue(env, variableId);
  if (!val || val.type !== 'COLOR') return null;
  return val.color;
}

/** `:root { --hfc-var-… }` declarations for COLOR variables in the active mode. */
export function buildRootCssVariableBlock(env: FileEnvelope): string {
  const parts: string[] = [];
  for (const col of env.variableCollections ?? []) {
    const modeId = activeModeIdForCollection(env, col);
    for (const v of col.variables) {
      if (v.resolvedType !== 'COLOR') continue;
      const raw = v.valuesByMode[modeId];
      if (!raw || raw.type !== 'COLOR') continue;
      const { r, g, b } = raw.color;
      const css = `rgba(${String(Math.round(r * 255))},${String(Math.round(g * 255))},${String(Math.round(b * 255))},1)`;
      parts.push(`${cssVarNameForVariable(v.id)}:${css};`);
    }
  }
  if (!parts.length) return '';
  return `:root{${parts.join('')}}`;
}

export interface VariableDefsPayload {
  version: 1;
  activeModes: Record<string, string>;
  collections: Array<{
    id: string;
    name: string;
    defaultModeId: string;
    modes: Array<{ id: string; name: string }>;
    variables: Array<{
      id: string;
      name: string;
      resolvedType: VariableDefinition['resolvedType'];
      activeModeId: string;
      value: VariableResolvedValue | null;
    }>;
  }>;
}

export function buildVariableDefsPayload(env: FileEnvelope): VariableDefsPayload {
  const collections = (env.variableCollections ?? []).map((col) => {
    const modeId = activeModeIdForCollection(env, col);
    return {
      id: col.id,
      name: col.name,
      defaultModeId: col.defaultModeId,
      modes: col.modes.map((m) => ({ id: m.id, name: m.name })),
      variables: col.variables.map((v) => ({
        id: v.id,
        name: v.name,
        resolvedType: v.resolvedType,
        activeModeId: modeId,
        value: v.valuesByMode[modeId] ?? null,
      })),
    };
  });
  const activeModes: Record<string, string> = {};
  for (const col of env.variableCollections ?? []) {
    activeModes[col.id] = activeModeIdForCollection(env, col);
  }
  return { version: 1, activeModes, collections };
}
