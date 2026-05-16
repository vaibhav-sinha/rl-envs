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

export function activeModeIdForCollection(
  env: FileEnvelope,
  col: VariableCollection,
  nodeModeOverrides?: Record<string, string>
): string {
  const nodeOverride = nodeModeOverrides?.[col.id];
  if (nodeOverride && col.modes.some((m) => m.id === nodeOverride)) return nodeOverride;
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

/** Effective definition for resolution (follows one level of alias chain). */
function effectiveVariableForResolution(
  env: FileEnvelope,
  variableId: string,
  depth = 0
): { collection: VariableCollection; variable: VariableDefinition } | null {
  if (depth > 32) return null;
  const hit = findVariableDefinition(env, variableId);
  if (!hit) return null;
  const alias = hit.variable.aliasOfVariableId;
  if (!alias) return hit;
  return effectiveVariableForResolution(env, alias, depth + 1);
}

export function resolveVariableValue(
  env: FileEnvelope,
  variableId: string,
  nodeModeOverrides?: Record<string, string>
): VariableResolvedValue | null {
  const hit = effectiveVariableForResolution(env, variableId);
  if (!hit) return null;
  const modeId = activeModeIdForCollection(env, hit.collection, nodeModeOverrides);
  return hit.variable.valuesByMode[modeId] ?? null;
}

export function resolveVariableToRgb(
  env: FileEnvelope,
  variableId: string,
  nodeModeOverrides?: Record<string, string>
): RGB | null {
  const hit = effectiveVariableForResolution(env, variableId);
  if (!hit || hit.variable.resolvedType !== 'COLOR') return null;
  const val = resolveVariableValue(env, variableId, nodeModeOverrides);
  if (!val || val.type !== 'COLOR') return null;
  return val.color;
}

export function resolveVariableToFloat(
  env: FileEnvelope,
  variableId: string,
  nodeModeOverrides?: Record<string, string>
): number | null {
  const hit = effectiveVariableForResolution(env, variableId);
  if (!hit || hit.variable.resolvedType !== 'FLOAT') return null;
  const val = resolveVariableValue(env, variableId, nodeModeOverrides);
  if (!val || val.type !== 'FLOAT') return null;
  return val.value;
}

export function resolveVariableToStringValue(
  env: FileEnvelope,
  variableId: string,
  nodeModeOverrides?: Record<string, string>
): string | null {
  const hit = effectiveVariableForResolution(env, variableId);
  if (!hit || hit.variable.resolvedType !== 'STRING') return null;
  const val = resolveVariableValue(env, variableId, nodeModeOverrides);
  if (!val || val.type !== 'STRING') return null;
  return val.value;
}

/** `:root { --hfc-var-… }` declarations for COLOR + FLOAT variables in the active mode (FLOAT emitted as px for layout CSS). */
export function buildRootCssVariableBlock(env: FileEnvelope): string {
  const parts: string[] = [];
  for (const col of env.variableCollections ?? []) {
    const modeId = activeModeIdForCollection(env, col);
    for (const v of col.variables) {
      if (v.aliasOfVariableId) continue;
      if (v.resolvedType === 'COLOR') {
        const raw = v.valuesByMode[modeId];
        if (!raw || raw.type !== 'COLOR') continue;
        const { r, g, b } = raw.color;
        const css = `rgba(${String(Math.round(r * 255))},${String(Math.round(g * 255))},${String(Math.round(b * 255))},1)`;
        parts.push(`${cssVarNameForVariable(v.id)}:${css};`);
        continue;
      }
      if (v.resolvedType === 'FLOAT') {
        const raw = v.valuesByMode[modeId];
        if (!raw || raw.type !== 'FLOAT') continue;
        parts.push(`${cssVarNameForVariable(v.id)}:${String(raw.value)}px;`);
        continue;
      }
      if (v.resolvedType === 'STRING') {
        const raw = v.valuesByMode[modeId];
        if (!raw || raw.type !== 'STRING') continue;
        const esc = JSON.stringify(raw.value);
        parts.push(`${cssVarNameForVariable(v.id)}:${esc};`);
      }
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
    modes: Array<{ modeId: string; name: string }>;
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
      modes: col.modes.map((m) => ({ modeId: m.id, name: m.name })),
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
