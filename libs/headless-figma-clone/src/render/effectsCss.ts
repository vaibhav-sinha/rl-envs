import type {
  BackgroundBlurEffect,
  DropShadowEffect,
  Effect,
  InnerShadowEffect,
  LayerBlurEffect,
  NoiseEffect,
  TextureEffect,
} from '../model/types.js';
import {
  boundEffectColorCss,
  boundEffectFloatCss,
  resolveEffectFloatPx,
  resolveEffectOffset,
  type EffectResolveContext,
} from './effectVariableResolve.js';

export type { EffectResolveContext };

function shadowLayer(
  ctx: EffectResolveContext,
  effect: DropShadowEffect | InnerShadowEffect,
  inset: boolean
): string {
  const { xCss, yCss } = resolveEffectOffset(ctx, effect);
  const radiusCss = boundEffectFloatCss(ctx, effect, 'radius', effect.radius);
  const spreadCss = boundEffectFloatCss(ctx, effect, 'spread', effect.spread ?? 0);
  const col = boundEffectColorCss(ctx, effect, 'color', 'rgba(0,0,0,0.35)');
  const prefix = inset ? 'inset ' : '';
  return `${prefix}${xCss} ${yCss} ${radiusCss} ${spreadCss} ${col}`;
}

export function allEffectsCss(
  effects: Effect[] | undefined,
  ctx: EffectResolveContext,
  warnings: string[],
  label: string
): string {
  if (!effects?.length) return '';
  const shadows: string[] = [];
  let layerBlurCss = '';
  let layerBlurPx = 0;
  let backdropBlurCss = '';
  let backdropBlurPx = 0;

  for (const e of effects) {
    if (e.visible === false) continue;
    if (e.type === 'DROP_SHADOW') {
      shadows.push(shadowLayer(ctx, e as DropShadowEffect, false));
    }
    if (e.type === 'INNER_SHADOW') {
      shadows.push(shadowLayer(ctx, e as InnerShadowEffect, true));
    }
    if (e.type === 'LAYER_BLUR') {
      const lb = e as LayerBlurEffect;
      const px = resolveEffectFloatPx(ctx, lb, 'radius', lb.radius);
      if (px >= layerBlurPx) {
        layerBlurPx = px;
        layerBlurCss = boundEffectFloatCss(ctx, lb, 'radius', lb.radius);
      }
    }
    if (e.type === 'BACKGROUND_BLUR') {
      const bb = e as BackgroundBlurEffect;
      const px = resolveEffectFloatPx(ctx, bb, 'radius', bb.radius);
      if (px >= backdropBlurPx) {
        backdropBlurPx = px;
        backdropBlurCss = boundEffectFloatCss(ctx, bb, 'radius', bb.radius);
      }
    }
    if (e.type === 'NOISE') {
      warnings.push(`effect_noise_skipped:${label}`);
      void (e as NoiseEffect);
    }
    if (e.type === 'TEXTURE') {
      warnings.push(`effect_texture_skipped:${label}`);
      void (e as TextureEffect);
    }
  }

  let s = '';
  if (shadows.length) s += `box-shadow:${shadows.join(',')};`;
  if (layerBlurCss) s += `filter:blur(${layerBlurCss});`;
  if (backdropBlurCss) {
    s += `backdrop-filter:blur(${backdropBlurCss});-webkit-backdrop-filter:blur(${backdropBlurCss});`;
  }
  return s;
}
