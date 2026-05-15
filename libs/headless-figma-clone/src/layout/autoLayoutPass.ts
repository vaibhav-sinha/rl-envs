import type { FileEnvelope } from '../model/types.js';

/**
 * Phase 4: auto-layout child positions are driven by **flex CSS** in `DesignCompiler`
 * (see `frameUsesFlexCss`). This hook remains for future compile-only coordinate passes.
 *
 * @see layout-and-bounds.md — must not mutate the persisted envelope; callers pass a clone.
 */
export function applyCompileOnlyAutoLayout(_env: FileEnvelope): void {
  /* no-op: flex layout emitted as CSS */
}
