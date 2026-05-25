import type { AxisSizingMode, FrameNode, LayoutSizing } from '../model/types.js';

/** Figma `layoutSizing*` HUG/FIXED ↔ `primaryAxisSizingMode` / `counterAxisSizingMode` (AUTO/FIXED). */
export function layoutSizingToAxisMode(sizing: LayoutSizing): AxisSizingMode | undefined {
  if (sizing === 'HUG') return 'AUTO';
  if (sizing === 'FIXED') return 'FIXED';
  return undefined;
}

export function axisSizingToLayoutSizing(mode: AxisSizingMode): LayoutSizing {
  return mode === 'AUTO' ? 'HUG' : 'FIXED';
}

export type LayoutSizingAxisSyncTarget = Pick<
  FrameNode,
  | 'layoutMode'
  | 'layoutSizingHorizontal'
  | 'layoutSizingVertical'
  | 'primaryAxisSizingMode'
  | 'counterAxisSizingMode'
>;

function isHorizontalVerticalAutoLayout(mode: FrameNode['layoutMode'] | undefined): boolean {
  return mode === 'HORIZONTAL' || mode === 'VERTICAL';
}

export type SyncAxisFromLayoutSizingOptions = {
  /** When true, only fill axis modes that are still unset (compile/import safety net). */
  onlyIfAxisUnset?: boolean;
};

/**
 * Apply Figma shorthand: `layoutSizingHorizontal` / `layoutSizingVertical` → axis sizing modes.
 * FILL is child-only grow semantics and does not map to frame axis modes.
 */
export function syncAxisSizingModesFromLayoutSizing(
  f: LayoutSizingAxisSyncTarget,
  options?: SyncAxisFromLayoutSizingOptions
): void {
  if (!isHorizontalVerticalAutoLayout(f.layoutMode)) return;

  const onlyIfUnset = options?.onlyIfAxisUnset === true;

  const apply = (sizing: LayoutSizing | undefined, axis: 'primaryAxisSizingMode' | 'counterAxisSizingMode') => {
    if (sizing === undefined) return;
    if (onlyIfUnset && f[axis] !== undefined) return;
    const mode = layoutSizingToAxisMode(sizing);
    if (mode !== undefined) f[axis] = mode;
  };

  if (f.layoutMode === 'HORIZONTAL') {
    apply(f.layoutSizingHorizontal, 'primaryAxisSizingMode');
    apply(f.layoutSizingVertical, 'counterAxisSizingMode');
  } else {
    apply(f.layoutSizingVertical, 'primaryAxisSizingMode');
    apply(f.layoutSizingHorizontal, 'counterAxisSizingMode');
  }
}

/** Keep `layoutSizing*` shorthand aligned when axis modes are set directly. */
export function syncLayoutSizingFromAxisSizingModes(f: LayoutSizingAxisSyncTarget): void {
  if (!isHorizontalVerticalAutoLayout(f.layoutMode)) return;

  const apply = (
    mode: AxisSizingMode | undefined,
    sizing: 'layoutSizingHorizontal' | 'layoutSizingVertical'
  ) => {
    if (mode === undefined) return;
    f[sizing] = axisSizingToLayoutSizing(mode);
  };

  if (f.layoutMode === 'HORIZONTAL') {
    apply(f.primaryAxisSizingMode, 'layoutSizingHorizontal');
    apply(f.counterAxisSizingMode, 'layoutSizingVertical');
  } else {
    apply(f.primaryAxisSizingMode, 'layoutSizingVertical');
    apply(f.counterAxisSizingMode, 'layoutSizingHorizontal');
  }
}
