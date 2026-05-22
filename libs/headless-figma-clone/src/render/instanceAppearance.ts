import type {
  BlendMode,
  Effect,
  FrameNode,
  FrameVariableBindings,
  IndividualStrokeWeights,
  Paint,
  StrokeCap,
  StrokeJoin,
} from '../model/types.js';

/** Paint array fields on instance roots that use tri-state semantics (excludes effects). */
export type InstancePaintArrayField = 'fills' | 'strokes' | 'backgrounds';

/** Style id fields: undefined = inherit, null = detached/cleared, string = explicit. */
export type InstanceStyleIdField = 'fillStyleId' | 'strokeStyleId' | 'effectStyleId';

/**
 * Instance-root appearance fields merged onto a cloned component root at compile time.
 * Tri-state: key absent = inherit master; `[]` = cleared; non-empty = override.
 */
export type InstanceAppearanceFields = {
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
  backgrounds?: Paint[];
  fillStyleId?: string | null;
  strokeStyleId?: string | null;
  effectStyleId?: string | null;
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  individualStrokeWeights?: Partial<IndividualStrokeWeights>;
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  cornerSmoothing?: number;
  boundVariables?: FrameVariableBindings;
  opacity?: number;
  blendMode?: BlendMode;
  visible?: boolean;
  clipsContent?: boolean;
};

export function hasOwnAppearanceField(
  source: object,
  field: keyof InstanceAppearanceFields
): boolean {
  return Object.prototype.hasOwnProperty.call(source, field);
}

function clonePaints(paints: Paint[]): Paint[] {
  return structuredClone(paints);
}

function cloneEffects(effects: Effect[]): Effect[] {
  return structuredClone(effects);
}

/** Apply tri-state paint/effect array: inherit / clear [] / copy non-empty. */
export function applyTriStatePaintArray(
  target: FrameNode,
  source: InstanceAppearanceFields,
  field: InstancePaintArrayField
): void {
  if (!hasOwnAppearanceField(source, field)) return;
  const value = source[field];
  if (value === undefined) return;
  const paints = value.length > 0 ? clonePaints(value) : [];
  if (field === 'fills') {
    target.fills = paints;
    if (value.length === 0) delete target.fillStyleId;
  } else if (field === 'strokes') {
    target.strokes = paints;
    if (value.length === 0) delete target.strokeStyleId;
  } else {
    target.backgrounds = paints;
  }
}

function applyTriStateEffects(target: FrameNode, source: InstanceAppearanceFields): void {
  if (!hasOwnAppearanceField(source, 'effects')) return;
  const value = source.effects;
  if (value === undefined) return;
  target.effects = value.length > 0 ? cloneEffects(value) : [];
  if (value.length === 0) {
    delete target.effectStyleId;
  }
}

/** Apply tri-state style id: inherit / clear (null) / set string. */
export function applyTriStateStyleId(
  target: FrameNode,
  source: InstanceAppearanceFields,
  field: InstanceStyleIdField
): void {
  if (!hasOwnAppearanceField(source, field)) return;
  const value = source[field];
  if (value === null || value === undefined) {
    delete target[field];
    return;
  }
  target[field] = value;
}

function copyIfDefined(
  target: FrameNode,
  source: InstanceAppearanceFields,
  field: keyof InstanceAppearanceFields
): void {
  if (!hasOwnAppearanceField(source, field)) return;
  const value = source[field];
  if (value === undefined) return;
  (target as unknown as Record<string, unknown>)[field] = value;
}

/**
 * Merge instance-root appearance onto a cloned component master frame.
 * Called from prepareInstanceComponentRoot after overrides / component properties.
 */
export function applyInstanceAppearanceToRoot(root: FrameNode, inst: InstanceAppearanceFields): void {
  applyTriStatePaintArray(root, inst, 'fills');
  applyTriStatePaintArray(root, inst, 'strokes');
  applyTriStatePaintArray(root, inst, 'backgrounds');
  applyTriStateEffects(root, inst);

  applyTriStateStyleId(root, inst, 'fillStyleId');
  applyTriStateStyleId(root, inst, 'strokeStyleId');
  applyTriStateStyleId(root, inst, 'effectStyleId');

  copyIfDefined(root, inst, 'strokeWeight');
  copyIfDefined(root, inst, 'strokeAlign');
  copyIfDefined(root, inst, 'strokeCap');
  copyIfDefined(root, inst, 'strokeJoin');
  copyIfDefined(root, inst, 'miterLimit');
  copyIfDefined(root, inst, 'dashPattern');
  copyIfDefined(root, inst, 'individualStrokeWeights');
  copyIfDefined(root, inst, 'cornerRadius');
  copyIfDefined(root, inst, 'topLeftRadius');
  copyIfDefined(root, inst, 'topRightRadius');
  copyIfDefined(root, inst, 'bottomRightRadius');
  copyIfDefined(root, inst, 'bottomLeftRadius');
  copyIfDefined(root, inst, 'cornerSmoothing');

  if (hasOwnAppearanceField(inst, 'boundVariables')) {
    root.boundVariables = inst.boundVariables
      ? structuredClone(inst.boundVariables)
      : undefined;
  }

  copyIfDefined(root, inst, 'opacity');
  copyIfDefined(root, inst, 'blendMode');
  copyIfDefined(root, inst, 'visible');
  copyIfDefined(root, inst, 'clipsContent');
}

/** Tri-state override fields for nested component children. */
export type OverrideAppearanceFields = {
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
};

export function applyTriStateOverridePaints(
  target: { fills?: Paint[]; strokes?: Paint[]; effects?: Effect[] },
  override: OverrideAppearanceFields,
  field: 'fills' | 'strokes' | 'effects'
): void {
  if (!Object.prototype.hasOwnProperty.call(override, field)) return;
  const value = override[field];
  if (value === undefined) return;
  if (field === 'effects') {
    (target as { effects?: Effect[] }).effects = value.length > 0 ? cloneEffects(value as Effect[]) : [];
    return;
  }
  (target as { fills?: Paint[]; strokes?: Paint[] })[field] =
    value.length > 0 ? clonePaints(value as Paint[]) : [];
}
