import type {
  BlendMode,
  Effect,
  LayoutSelfFields,
  Paint,
  RGB,
  StrokeCap,
  StrokeJoin,
} from '../model/types.js';
import type { ImportReport } from './importReport.js';

export function prop(props: Record<string, unknown>, key: string): unknown {
  return props[key];
}

export function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function optNum(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function optStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function bool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

function mapRgb(c: unknown): RGB | null {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown>;
  if (typeof o.r !== 'number' || typeof o.g !== 'number' || typeof o.b !== 'number') return null;
  return { r: o.r, g: o.g, b: o.b };
}

export function mapPaints(
  raw: unknown,
  imageHashRemap: (figmaHash: string) => string | undefined
): Paint[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Paint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    const type = p.type;
    if (type === 'SOLID') {
      const color = mapRgb(p.color);
      if (!color) continue;
      out.push({
        type: 'SOLID',
        color,
        visible: bool(p.visible),
        opacity: optNum(p.opacity),
        blendMode: p.blendMode as BlendMode | undefined,
      });
    } else if (type === 'GRADIENT_LINEAR' || type === 'GRADIENT_RADIAL') {
      const gradientTransform = p.gradientTransform;
      const gradientStops = p.gradientStops;
      if (!Array.isArray(gradientTransform) || !Array.isArray(gradientStops)) continue;
      out.push({
        type: type as 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL',
        gradientTransform: gradientTransform as [[number, number, number], [number, number, number]],
        gradientStops: gradientStops as { position: number; color: { r: number; g: number; b: number; a?: number } }[],
        visible: bool(p.visible),
        opacity: optNum(p.opacity),
        blendMode: p.blendMode as BlendMode | undefined,
      });
    } else if (type === 'IMAGE') {
      const figmaHash = str(p.imageHash);
      const remapped = imageHashRemap(figmaHash);
      if (!remapped) continue;
      out.push({
        type: 'IMAGE',
        imageHash: remapped,
        scaleMode: (p.scaleMode as 'FILL' | 'FIT' | 'TILE' | 'STRETCH') ?? 'FILL',
        visible: bool(p.visible),
        opacity: optNum(p.opacity),
        blendMode: p.blendMode as BlendMode | undefined,
      });
    } else if (type === 'VARIABLE_COLOR') {
      const variableId = str(p.variableId);
      if (!variableId) continue;
      out.push({
        type: 'VARIABLE_COLOR',
        variableId,
        visible: bool(p.visible),
        opacity: optNum(p.opacity),
        blendMode: p.blendMode as BlendMode | undefined,
      });
    }
  }
  return out.length > 0 ? out : undefined;
}

export function mapEffects(raw: unknown): Effect[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Effect[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const type = e.type;
    if (type === 'DROP_SHADOW' || type === 'INNER_SHADOW') {
      const color = mapRgb((e.color as Record<string, unknown>)?.color ?? e.color);
      if (!color) continue;
      out.push({
        type,
        color: { r: color.r, g: color.g, b: color.b, a: optNum((e.color as Record<string, unknown>)?.a) ?? 1 },
        offset: { x: num((e.offset as Record<string, unknown>)?.x), y: num((e.offset as Record<string, unknown>)?.y) },
        radius: num(e.radius),
        spread: optNum(e.spread),
        visible: bool(e.visible),
        blendMode: e.blendMode as BlendMode | undefined,
      } as Effect);
    } else if (type === 'LAYER_BLUR' || type === 'BACKGROUND_BLUR') {
      out.push({
        type,
        radius: num(e.radius),
        visible: bool(e.visible),
      } as Effect);
    }
  }
  return out.length > 0 ? out : undefined;
}

export function mapLayoutSelf(props: Record<string, unknown>): Partial<LayoutSelfFields> {
  const out: Partial<LayoutSelfFields> = {};
  const layoutPositioning = prop(props, 'layoutPositioning');
  if (layoutPositioning === 'ABSOLUTE' || layoutPositioning === 'AUTO') {
    out.layoutPositioning = layoutPositioning;
  }
  const sizingH = prop(props, 'layoutSizingHorizontal');
  if (sizingH === 'FIXED' || sizingH === 'HUG' || sizingH === 'FILL') {
    out.layoutSizingHorizontal = sizingH;
  }
  const sizingV = prop(props, 'layoutSizingVertical');
  if (sizingV === 'FIXED' || sizingV === 'HUG' || sizingV === 'FILL') {
    out.layoutSizingVertical = sizingV;
  }
  const align = prop(props, 'layoutAlign');
  if (align === 'MIN' || align === 'CENTER' || align === 'MAX' || align === 'STRETCH' || align === 'INHERIT') {
    out.layoutAlign = align;
  }
  const grow = optNum(prop(props, 'layoutGrow'));
  if (grow !== undefined) out.layoutGrow = grow;
  if (prop(props, 'isMask') === true) out.isMask = true;
  return out;
}

export function mapStrokeExtras(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const sw = optNum(prop(props, 'strokeWeight'));
  if (sw !== undefined) out.strokeWeight = sw;
  const sa = prop(props, 'strokeAlign');
  if (sa === 'INSIDE' || sa === 'OUTSIDE' || sa === 'CENTER') out.strokeAlign = sa;
  const sc = prop(props, 'strokeCap');
  if (typeof sc === 'string') out.strokeCap = sc as StrokeCap;
  const sj = prop(props, 'strokeJoin');
  if (typeof sj === 'string') out.strokeJoin = sj as StrokeJoin;
  const ml = optNum(prop(props, 'miterLimit'));
  if (ml !== undefined) out.miterLimit = ml;
  if (Array.isArray(prop(props, 'dashPattern'))) out.dashPattern = prop(props, 'dashPattern');
  return out;
}

export function mapCornerRadii(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const cr = optNum(prop(props, 'cornerRadius'));
  if (cr !== undefined) out.cornerRadius = cr;
  for (const k of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'] as const) {
    const v = optNum(prop(props, k));
    if (v !== undefined) out[k] = v;
  }
  const cs = optNum(prop(props, 'cornerSmoothing'));
  if (cs !== undefined) out.cornerSmoothing = cs;
  return out;
}

export function mapBlendOpacity(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const rot = optNum(prop(props, 'rotation'));
  if (rot !== undefined) out.rotation = rot;
  const op = optNum(prop(props, 'opacity'));
  if (op !== undefined) out.opacity = op;
  const bm = prop(props, 'blendMode');
  if (typeof bm === 'string') out.blendMode = bm as BlendMode;
  const vis = bool(prop(props, 'visible'));
  if (vis !== undefined) out.visible = vis;
  const locked = bool(prop(props, 'locked'));
  if (locked !== undefined) out.locked = locked;
  return out;
}

/** Page/canvas origin of a parent node (sum of ancestor x/y in the HFC tree). */
export type ParentPageOrigin = { x: number; y: number };

/** Page/canvas origin for this node's children after import. */
export function childPageOrigin(parentPageOrigin: ParentPageOrigin | undefined, bounds: ParentPageOrigin): ParentPageOrigin {
  return {
    x: (parentPageOrigin?.x ?? 0) + bounds.x,
    y: (parentPageOrigin?.y ?? 0) + bounds.y,
  };
}

/**
 * Bounds for HFC nodes. Plugin snapshots prefer `absoluteBoundingBox` (page space);
 * subtract `parentPageOrigin` so nested nodes get parent-relative x/y for the compiler.
 * Fallback `x`/`y` props are already parent-relative in Figma.
 */
function hasLocalGeometry(props: Record<string, unknown>): boolean {
  return (
    typeof prop(props, 'x') === 'number' &&
    typeof prop(props, 'y') === 'number' &&
    typeof prop(props, 'width') === 'number' &&
    typeof prop(props, 'height') === 'number'
  );
}

/**
 * Bounds for HFC nodes. Prefer Figma parent-relative `x`/`y`/`width`/`height` when present;
 * otherwise derive from `absoluteBoundingBox` minus `parentPageOrigin`.
 */
export function boundsFromProps(
  props: Record<string, unknown>,
  parentPageOrigin?: ParentPageOrigin
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (hasLocalGeometry(props)) {
    return {
      x: num(prop(props, 'x')),
      y: num(prop(props, 'y')),
      width: num(prop(props, 'width'), 1),
      height: num(prop(props, 'height'), 1),
    };
  }
  const box = prop(props, 'absoluteBoundingBox') as Record<string, unknown> | undefined;
  if (box) {
    const ox = parentPageOrigin?.x ?? 0;
    const oy = parentPageOrigin?.y ?? 0;
    return {
      x: num(box.x) - ox,
      y: num(box.y) - oy,
      width: num(box.width),
      height: num(box.height),
    };
  }
  return {
    x: num(prop(props, 'x')),
    y: num(prop(props, 'y')),
    width: num(prop(props, 'width'), 1),
    height: num(prop(props, 'height'), 1),
  };
}

export function skipUnknownProperty(
  report: ImportReport,
  figmaId: string,
  key: string,
  _reason: string
): void {
  report.skippedProperties.push({ figmaId, key });
}
