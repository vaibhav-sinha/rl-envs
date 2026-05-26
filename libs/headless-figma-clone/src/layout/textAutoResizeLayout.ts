import type { LayoutSizing, TextNode } from '../model/types.js';

/** Patch fields produced by mode-aware {@link buildTextResizePatch}. */
export type TextResizePatch = {
  width?: number;
  height?: number;
  layoutSizingHorizontal?: LayoutSizing;
  layoutSizingVertical?: LayoutSizing;
};

/**
 * Figma `text.resize(w, h)` behavior by `textAutoResize`:
 * - HEIGHT: fix width, grow height (do not lock vertical to FIXED).
 * - WIDTH_AND_HEIGHT: hug both axes (ignore explicit box size).
 * - NONE / TRUNCATE: fixed box.
 */
export function buildTextResizePatch(
  t: Pick<TextNode, 'textAutoResize' | 'layoutSizingHorizontal'>,
  w: number,
  h: number
): TextResizePatch {
  const mode = t.textAutoResize ?? 'NONE';

  if (mode === 'HEIGHT') {
    const patch: TextResizePatch = {
      width: w,
      layoutSizingVertical: 'HUG',
    };
    patch.layoutSizingHorizontal = t.layoutSizingHorizontal === 'FILL' ? 'FILL' : 'FIXED';
    return patch;
  }

  if (mode === 'WIDTH_AND_HEIGHT') {
    return {
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
    };
  }

  return {
    width: w,
    height: h > 0 ? h : undefined,
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
  };
}

export type ApplyTextAutoResizeLayoutSizingOptions = {
  /** Only assign layoutSizing when still unset (e.g. on append). */
  onlyIfUnset?: boolean;
};

/**
 * Keep `layoutSizing*` aligned with `textAutoResize` (Figma auto-layout child semantics).
 */
export function applyTextAutoResizeLayoutSizing(
  t: TextNode,
  options?: ApplyTextAutoResizeLayoutSizingOptions
): void {
  const mode = t.textAutoResize;
  if (!mode || mode === 'NONE' || mode === 'TRUNCATE') return;

  const assignH = (value: LayoutSizing) => {
    if (options?.onlyIfUnset && t.layoutSizingHorizontal !== undefined) return;
    if (value === 'FIXED' && t.layoutSizingHorizontal === 'FILL') return;
    t.layoutSizingHorizontal = value;
  };
  const assignV = (value: LayoutSizing) => {
    if (options?.onlyIfUnset && t.layoutSizingVertical !== undefined) return;
    t.layoutSizingVertical = value;
  };

  if (mode === 'HEIGHT') {
    if ((t.width ?? 0) > 0) {
      assignH(t.layoutSizingHorizontal === 'FILL' ? 'FILL' : 'FIXED');
    }
    assignV('HUG');
    return;
  }

  if (mode === 'WIDTH_AND_HEIGHT') {
    assignH('HUG');
    assignV('HUG');
  }
}
