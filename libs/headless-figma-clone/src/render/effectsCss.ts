import type {
  BackgroundBlurEffect,
  DropShadowEffect,
  Effect,
  InnerShadowEffect,
  LayerBlurEffect,
  NoiseEffect,
  TextureEffect,
} from '../model/types.js';

function rgbaFromEffectColor(c: { r: number; g: number; b: number; a?: number }): string {
  const a = c.a ?? 1;
  return `rgba(${String(Math.round(c.r * 255))},${String(Math.round(c.g * 255))},${String(Math.round(c.b * 255))},${String(a)})`;
}

export function allEffectsCss(effects: Effect[] | undefined, warnings: string[], label: string): string {
  if (!effects?.length) return '';
  const shadows: string[] = [];
  let layerBlur = 0;
  let backdropBlur = 0;
  for (const e of effects) {
    if (e.visible === false) continue;
    if (e.type === 'DROP_SHADOW') {
      const ds = e as DropShadowEffect;
      const col = ds.color ? rgbaFromEffectColor(ds.color) : 'rgba(0,0,0,0.35)';
      shadows.push(
        `${String(ds.offset.x)}px ${String(ds.offset.y)}px ${String(ds.radius)}px ${String(ds.spread ?? 0)}px ${col}`
      );
    }
    if (e.type === 'INNER_SHADOW') {
      const is = e as InnerShadowEffect;
      const col = is.color ? rgbaFromEffectColor(is.color) : 'rgba(0,0,0,0.35)';
      shadows.push(
        `inset ${String(is.offset.x)}px ${String(is.offset.y)}px ${String(is.radius)}px ${String(is.spread ?? 0)}px ${col}`
      );
    }
    if (e.type === 'LAYER_BLUR') {
      const lb = e as LayerBlurEffect;
      if (lb.radius > layerBlur) layerBlur = lb.radius;
    }
    if (e.type === 'BACKGROUND_BLUR') {
      const bb = e as BackgroundBlurEffect;
      if (bb.radius > backdropBlur) backdropBlur = bb.radius;
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
  if (layerBlur > 0) s += `filter:blur(${String(layerBlur)}px);`;
  if (backdropBlur > 0) {
    s += `backdrop-filter:blur(${String(backdropBlur)}px);-webkit-backdrop-filter:blur(${String(backdropBlur)}px);`;
  }
  return s;
}
