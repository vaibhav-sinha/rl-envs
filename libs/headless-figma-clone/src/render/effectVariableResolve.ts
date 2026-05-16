import type {
  EffectBoundVariableField,
  EffectBoundVariables,
  FileEnvelope,
  LayoutGridBoundVariableField,
  LayoutGridColumns,
  RGBA,
} from '../model/types.js';
import {
  cssVarNameForVariable,
  resolveVariableToFloat,
  resolveVariableToRgb,
} from '../variables/resolution.js';

export interface EffectResolveContext {
  env: FileEnvelope;
  nodeModeOverrides?: Record<string, string>;
}

function aliasId(bv: EffectBoundVariables | undefined, field: EffectBoundVariableField): string | undefined {
  return bv?.[field]?.id;
}

export function boundEffectFloatCss(
  ctx: EffectResolveContext,
  effect: { boundVariables?: EffectBoundVariables },
  field: EffectBoundVariableField,
  fallbackPx: number
): string {
  const vid = aliasId(effect.boundVariables, field);
  if (!vid) return `${String(fallbackPx)}px`;
  const v = resolveVariableToFloat(ctx.env, vid, ctx.nodeModeOverrides);
  const fb = v !== null ? v : fallbackPx;
  return `var(${cssVarNameForVariable(vid)},${String(fb)}px)`;
}

export function boundEffectColorCss(
  ctx: EffectResolveContext,
  effect: { boundVariables?: EffectBoundVariables; color?: RGBA },
  field: 'color',
  fallback: string
): string {
  const vid = aliasId(effect.boundVariables, field);
  if (!vid) {
    if (effect.color) {
      const c = effect.color;
      const a = c.a ?? 1;
      return `rgba(${String(Math.round(c.r * 255))},${String(Math.round(c.g * 255))},${String(Math.round(c.b * 255))},${String(a)})`;
    }
    return fallback;
  }
  const rgb = resolveVariableToRgb(ctx.env, vid, ctx.nodeModeOverrides);
  if (rgb) {
    const fb = `rgba(${String(Math.round(rgb.r * 255))},${String(Math.round(rgb.g * 255))},${String(Math.round(rgb.b * 255))},1)`;
    return `var(${cssVarNameForVariable(vid)},${fb})`;
  }
  if (effect.color) {
    const c = effect.color;
    const a = c.a ?? 1;
    const fb = `rgba(${String(Math.round(c.r * 255))},${String(Math.round(c.g * 255))},${String(Math.round(c.b * 255))},${String(a)})`;
    return `var(${cssVarNameForVariable(vid)},${fb})`;
  }
  return `var(${cssVarNameForVariable(vid)},${fallback})`;
}

export function resolveEffectOffset(
  ctx: EffectResolveContext,
  effect: { offset: { x: number; y: number }; boundVariables?: EffectBoundVariables }
): { xCss: string; yCss: string } {
  const ox = effect.offset.x;
  const oy = effect.offset.y;
  return {
    xCss: boundEffectFloatCss(ctx, effect, 'offsetX', ox),
    yCss: boundEffectFloatCss(ctx, effect, 'offsetY', oy),
  };
}

export function resolveEffectFloatPx(
  ctx: EffectResolveContext,
  effect: { boundVariables?: EffectBoundVariables },
  field: EffectBoundVariableField,
  fallbackPx: number
): number {
  const vid = aliasId(effect.boundVariables, field);
  if (!vid) return fallbackPx;
  const v = resolveVariableToFloat(ctx.env, vid, ctx.nodeModeOverrides);
  return v !== null ? v : fallbackPx;
}

/** Effective gutter (px) after variable bind on layout grid. */
export function effectiveLayoutGridGutter(ctx: EffectResolveContext, grid: LayoutGridColumns): number {
  const fromGutter = grid.boundVariables?.gutterSize?.id;
  if (fromGutter) {
    const v = resolveVariableToFloat(ctx.env, fromGutter, ctx.nodeModeOverrides);
    if (v !== null) return Math.max(0, v);
  }
  return grid.gutter;
}

/** Effective column count after variable bind on layout grid. */
export function effectiveLayoutGridCount(ctx: EffectResolveContext, grid: LayoutGridColumns): number {
  const fromCount = grid.boundVariables?.count?.id;
  if (fromCount) {
    const v = resolveVariableToFloat(ctx.env, fromCount, ctx.nodeModeOverrides);
    if (v !== null) return Math.max(1, Math.round(v));
  }
  const fromSection = grid.boundVariables?.sectionSize?.id;
  if (fromSection) {
    const v = resolveVariableToFloat(ctx.env, fromSection, ctx.nodeModeOverrides);
    if (v !== null && v > 0) return Math.max(1, Math.round(v));
  }
  return grid.count;
}

export function boundLayoutGridFloatCss(
  ctx: EffectResolveContext,
  grid: LayoutGridColumns,
  field: LayoutGridBoundVariableField,
  fallback: number
): string {
  const vid = grid.boundVariables?.[field]?.id;
  if (!vid) return `${String(fallback)}px`;
  const v = resolveVariableToFloat(ctx.env, vid, ctx.nodeModeOverrides);
  const fb = v !== null ? v : fallback;
  return `var(${cssVarNameForVariable(vid)},${String(fb)}px)`;
}
