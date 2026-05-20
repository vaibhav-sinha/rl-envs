import { ulid } from 'ulid';
import type { EngineOperation } from '../engine/DocumentEngine.js';
import { applyEnvelopeOperation, type EnvelopeOperation } from '../engine/envelopeOps.js';
import type {
  Effect,
  EffectStyleDefinition,
  FileEnvelope,
  GridStyleDefinition,
  LayoutGridColumns,
  Paint,
  PaintStyleDefinition,
  TextStyleDefinition,
} from '../model/types.js';
import { HFC_STYLE_FLAG, HFC_STYLE_MARKER } from '../mcp/scriptNodeSnapshot.js';
import { ValidationErr } from '../util/errors.js';

export interface ScriptPaintStyle {
  id: string;
  name: string;
  paints: Paint[];
}

export interface ScriptTextStyle {
  id: string;
  name: string;
  fontSize?: number;
  fontWeight?: number;
  fills?: Paint[];
}

export interface ScriptEffectStyle {
  id: string;
  name: string;
  effects: Effect[];
}

export interface ScriptGridStyle {
  id: string;
  name: string;
  layoutGrids: LayoutGridColumns[];
}

type StylesScriptCtx = {
  working: FileEnvelope;
  ops: EngineOperation[];
  onMutate?: () => void;
};

function queueEnv(ctx: StylesScriptCtx, op: EnvelopeOperation): void {
  ctx.onMutate?.();
  ctx.ops.push(op);
  applyEnvelopeOperation(ctx.working, op);
}

/** Proxy target only — style fields are resolved via the get trap from the envelope. */
type StyleProxyTarget = {
  id: string;
  kind: string;
  [HFC_STYLE_MARKER]: true;
  [HFC_STYLE_FLAG]: true;
};

function wrapPaintStyle(ctx: { working: FileEnvelope; ops: EngineOperation[] }, id: string): ScriptPaintStyle {
  const target: StyleProxyTarget = {
    id,
    kind: 'paint',
    [HFC_STYLE_MARKER]: true,
    [HFC_STYLE_FLAG]: true,
  };
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === 'id') return id;
      if (prop === HFC_STYLE_MARKER || prop === HFC_STYLE_FLAG) return true;
      if (prop === 'kind') return 'paint';
      return findPaintStyle(ctx.working, id)?.[prop as keyof PaintStyleDefinition];
    },
    set(_t, prop, value) {
      if (prop === 'name' && typeof value === 'string') {
        queueEnv(ctx, { op: 'updatePaintStyle', id, patch: { name: value } });
        return true;
      }
      if (prop === 'paints' && Array.isArray(value)) {
        queueEnv(ctx, { op: 'updatePaintStyle', id, patch: { paints: value as Paint[] } });
        return true;
      }
      return false;
    },
  }) as unknown as ScriptPaintStyle;
}

function wrapTextStyle(ctx: { working: FileEnvelope; ops: EngineOperation[] }, id: string): ScriptTextStyle {
  const target: StyleProxyTarget = {
    id,
    kind: 'text',
    [HFC_STYLE_MARKER]: true,
    [HFC_STYLE_FLAG]: true,
  };
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === 'id') return id;
      if (prop === HFC_STYLE_MARKER || prop === HFC_STYLE_FLAG) return true;
      if (prop === 'kind') return 'text';
      return findTextStyle(ctx.working, id)?.[prop as keyof TextStyleDefinition];
    },
    set(_t, prop, value) {
      if (prop === 'name' && typeof value === 'string') {
        queueEnv(ctx, { op: 'updateTextStyle', id, patch: { name: value } });
        return true;
      }
      if (prop === 'fontSize' && typeof value === 'number') {
        queueEnv(ctx, { op: 'updateTextStyle', id, patch: { fontSize: value } });
        return true;
      }
      if (prop === 'fontWeight' && typeof value === 'number') {
        queueEnv(ctx, { op: 'updateTextStyle', id, patch: { fontWeight: value } });
        return true;
      }
      if (prop === 'fills' && Array.isArray(value)) {
        queueEnv(ctx, { op: 'updateTextStyle', id, patch: { fills: value as Paint[] } });
        return true;
      }
      return false;
    },
  }) as unknown as ScriptTextStyle;
}

function findPaintStyle(env: FileEnvelope, id: string): PaintStyleDefinition | null {
  return env.paintStyles?.find((s) => s.id === id) ?? null;
}

function findTextStyle(env: FileEnvelope, id: string): TextStyleDefinition | null {
  return env.textStyles?.find((s) => s.id === id) ?? null;
}

function findEffectStyle(env: FileEnvelope, id: string): EffectStyleDefinition | null {
  return env.effectStyles?.find((s) => s.id === id) ?? null;
}

function findGridStyle(env: FileEnvelope, id: string): GridStyleDefinition | null {
  return env.gridStyles?.find((s) => s.id === id) ?? null;
}

export function createStylesApi(ctx: StylesScriptCtx): Record<string, unknown> {

  const moveAfter = (
    kind: 'paint' | 'text' | 'effect' | 'grid',
    target: { id: string },
    reference: { id: string } | null
  ): void => {
    const opName =
      kind === 'paint'
        ? 'movePaintStyleAfter'
        : kind === 'text'
          ? 'moveTextStyleAfter'
          : kind === 'effect'
            ? 'moveEffectStyleAfter'
            : 'moveGridStyleAfter';
    queueEnv(ctx, {
      op: opName,
      targetId: target.id,
      afterId: reference?.id ?? null,
    } as EnvelopeOperation);
  };

  return {
    getStyleByIdAsync: async (id: string): Promise<ScriptPaintStyle | ScriptTextStyle | ScriptEffectStyle | ScriptGridStyle | null> => {
      if (findPaintStyle(ctx.working, id)) return wrapPaintStyle(ctx, id);
      if (findTextStyle(ctx.working, id)) return wrapTextStyle(ctx, id);
      return findEffectStyle(ctx.working, id) ?? findGridStyle(ctx.working, id);
    },

    getStyleById: (id: string): ScriptPaintStyle | ScriptTextStyle | ScriptEffectStyle | ScriptGridStyle | null => {
      if (findPaintStyle(ctx.working, id)) return wrapPaintStyle(ctx, id);
      if (findTextStyle(ctx.working, id)) return wrapTextStyle(ctx, id);
      return findEffectStyle(ctx.working, id) ?? findGridStyle(ctx.working, id);
    },

    createPaintStyle: (): ScriptPaintStyle => {
      const id = ulid();
      const name = 'Paint Style';
      queueEnv(ctx, {
        op: 'createPaintStyle',
        id,
        name,
        paints: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      });
      return wrapPaintStyle(ctx, id);
    },

    createTextStyle: (): ScriptTextStyle => {
      const id = ulid();
      queueEnv(ctx, { op: 'createTextStyle', id, name: 'Text Style' });
      return wrapTextStyle(ctx, id);
    },

    createEffectStyle: (): ScriptEffectStyle => {
      const id = ulid();
      queueEnv(ctx, {
        op: 'createEffectStyle',
        id,
        name: 'Effect Style',
        effects: [
          {
            type: 'DROP_SHADOW',
            offset: { x: 0, y: 4 },
            radius: 8,
            color: { r: 0, g: 0, b: 0, a: 0.25 },
            blendMode: 'NORMAL',
          },
        ],
      });
      return findEffectStyle(ctx.working, id)!;
    },

    createGridStyle: (): ScriptGridStyle => {
      const id = ulid();
      queueEnv(ctx, {
        op: 'createGridStyle',
        id,
        name: 'Grid Style',
        layoutGrids: [{ type: 'COLUMNS', count: 12, gutter: 20 }],
      });
      return findGridStyle(ctx.working, id)!;
    },

    getLocalPaintStylesAsync: async (): Promise<ScriptPaintStyle[]> =>
      (ctx.working.paintStyles ?? []).map((s) => wrapPaintStyle(ctx, s.id)),
    getLocalPaintStyles: (): ScriptPaintStyle[] =>
      (ctx.working.paintStyles ?? []).map((s) => wrapPaintStyle(ctx, s.id)),
    getLocalTextStylesAsync: async (): Promise<ScriptTextStyle[]> =>
      (ctx.working.textStyles ?? []).map((s) => wrapTextStyle(ctx, s.id)),
    getLocalTextStyles: (): ScriptTextStyle[] =>
      (ctx.working.textStyles ?? []).map((s) => wrapTextStyle(ctx, s.id)),
    getLocalEffectStylesAsync: async (): Promise<ScriptEffectStyle[]> => [...(ctx.working.effectStyles ?? [])],
    getLocalEffectStyles: (): ScriptEffectStyle[] => [...(ctx.working.effectStyles ?? [])],
    getLocalGridStylesAsync: async (): Promise<ScriptGridStyle[]> => [...(ctx.working.gridStyles ?? [])],
    getLocalGridStyles: (): ScriptGridStyle[] => [...(ctx.working.gridStyles ?? [])],

    moveLocalPaintStyleAfter: (target: ScriptPaintStyle, reference: ScriptPaintStyle | null): void => {
      if (!findPaintStyle(ctx.working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown paint style ${target.id}`);
      moveAfter('paint', target, reference);
    },

    moveLocalTextStyleAfter: (target: ScriptTextStyle, reference: ScriptTextStyle | null): void => {
      if (!findTextStyle(ctx.working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown text style ${target.id}`);
      moveAfter('text', target, reference);
    },

    moveLocalEffectStyleAfter: (target: ScriptEffectStyle, reference: ScriptEffectStyle | null): void => {
      if (!findEffectStyle(ctx.working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown effect style ${target.id}`);
      moveAfter('effect', target, reference);
    },

    moveLocalGridStyleAfter: (target: ScriptGridStyle, reference: ScriptGridStyle | null): void => {
      if (!findGridStyle(ctx.working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown grid style ${target.id}`);
      moveAfter('grid', target, reference);
    },

    moveLocalPaintFolderAfter: (): never => {
      throw new ValidationErr('UNSUPPORTED_OPERATION', 'moveLocalPaintFolderAfter: folder moves not implemented (use style name prefixes)');
    },
    moveLocalTextFolderAfter: (): never => {
      throw new ValidationErr('UNSUPPORTED_OPERATION', 'moveLocalTextFolderAfter: folder moves not implemented (use style name prefixes)');
    },
    moveLocalEffectFolderAfter: (): never => {
      throw new ValidationErr('UNSUPPORTED_OPERATION', 'moveLocalEffectFolderAfter: folder moves not implemented (use style name prefixes)');
    },
    moveLocalGridFolderAfter: (): never => {
      throw new ValidationErr('UNSUPPORTED_OPERATION', 'moveLocalGridFolderAfter: folder moves not implemented (use style name prefixes)');
    },
  };
}
