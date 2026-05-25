import { ulid } from 'ulid';
import { applyEnvelopeOperation, type EnvelopeOperation } from '../engine/envelopeOps.js';
import type { Effect, LayoutGridColumns, Paint } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import {
  createStyleProxy,
  findEffectStyle,
  findGridStyle,
  findPaintStyle,
  findTextStyle,
  type StylesScriptCtx,
} from './createStyleProxy.js';

export type { StylesScriptCtx };

export interface ScriptPaintStyle {
  readonly type: 'PAINT';
  id: string;
  name: string;
  paints: Paint[];
}

export interface ScriptTextStyle {
  readonly type: 'TEXT';
  id: string;
  name: string;
  fontName?: import('../model/types.js').FontName;
  fontSize?: number;
  fontWeight?: number;
  fills?: Paint[];
}

export interface ScriptEffectStyle {
  readonly type: 'EFFECT';
  id: string;
  name: string;
  effects: Effect[];
}

export interface ScriptGridStyle {
  readonly type: 'GRID';
  id: string;
  name: string;
  layoutGrids: LayoutGridColumns[];
}

function queueEnv(ctx: StylesScriptCtx, op: EnvelopeOperation): void {
  ctx.onMutate?.();
  ctx.ops.push(op);
  applyEnvelopeOperation(ctx.working, op);
}

export function createStylesApi(ctx: StylesScriptCtx): Record<string, unknown> {
  const moveAfter = (
    route: 'paint' | 'text' | 'effect' | 'grid',
    target: { id: string },
    reference: { id: string } | null
  ): void => {
    const opName =
      route === 'paint'
        ? 'movePaintStyleAfter'
        : route === 'text'
          ? 'moveTextStyleAfter'
          : route === 'effect'
            ? 'moveEffectStyleAfter'
            : 'moveGridStyleAfter';
    queueEnv(ctx, {
      op: opName,
      targetId: target.id,
      afterId: reference?.id ?? null,
    } as EnvelopeOperation);
  };

  const wrap = (route: 'paint' | 'text' | 'effect' | 'grid', id: string) =>
    createStyleProxy(ctx, route, id) as ScriptPaintStyle | ScriptTextStyle | ScriptEffectStyle | ScriptGridStyle;

  return {
    getStyleByIdAsync: async (id: string) => {
      if (findPaintStyle(ctx.working, id)) return wrap('paint', id);
      if (findTextStyle(ctx.working, id)) return wrap('text', id);
      if (findEffectStyle(ctx.working, id)) return wrap('effect', id);
      if (findGridStyle(ctx.working, id)) return wrap('grid', id);
      return null;
    },

    getStyleById: (id: string) => {
      if (findPaintStyle(ctx.working, id)) return wrap('paint', id);
      if (findTextStyle(ctx.working, id)) return wrap('text', id);
      if (findEffectStyle(ctx.working, id)) return wrap('effect', id);
      if (findGridStyle(ctx.working, id)) return wrap('grid', id);
      return null;
    },

    createPaintStyle: (): ScriptPaintStyle => {
      const id = ulid();
      queueEnv(ctx, {
        op: 'createPaintStyle',
        id,
        name: 'Paint Style',
        paints: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      });
      return wrap('paint', id) as ScriptPaintStyle;
    },

    createTextStyle: (): ScriptTextStyle => {
      const id = ulid();
      queueEnv(ctx, { op: 'createTextStyle', id, name: 'Text Style' });
      return wrap('text', id) as ScriptTextStyle;
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
      return wrap('effect', id) as ScriptEffectStyle;
    },

    createGridStyle: (): ScriptGridStyle => {
      const id = ulid();
      queueEnv(ctx, {
        op: 'createGridStyle',
        id,
        name: 'Grid Style',
        layoutGrids: [{ type: 'COLUMNS', count: 12, gutter: 20 }],
      });
      return wrap('grid', id) as ScriptGridStyle;
    },

    getLocalPaintStylesAsync: async (): Promise<ScriptPaintStyle[]> =>
      (ctx.working.paintStyles ?? []).map((s) => wrap('paint', s.id) as ScriptPaintStyle),
    getLocalPaintStyles: (): ScriptPaintStyle[] =>
      (ctx.working.paintStyles ?? []).map((s) => wrap('paint', s.id) as ScriptPaintStyle),
    getLocalTextStylesAsync: async (): Promise<ScriptTextStyle[]> =>
      (ctx.working.textStyles ?? []).map((s) => wrap('text', s.id) as ScriptTextStyle),
    getLocalTextStyles: (): ScriptTextStyle[] =>
      (ctx.working.textStyles ?? []).map((s) => wrap('text', s.id) as ScriptTextStyle),
    getLocalEffectStylesAsync: async (): Promise<ScriptEffectStyle[]> =>
      (ctx.working.effectStyles ?? []).map((s) => wrap('effect', s.id) as ScriptEffectStyle),
    getLocalEffectStyles: (): ScriptEffectStyle[] =>
      (ctx.working.effectStyles ?? []).map((s) => wrap('effect', s.id) as ScriptEffectStyle),
    getLocalGridStylesAsync: async (): Promise<ScriptGridStyle[]> =>
      (ctx.working.gridStyles ?? []).map((s) => wrap('grid', s.id) as ScriptGridStyle),
    getLocalGridStyles: (): ScriptGridStyle[] =>
      (ctx.working.gridStyles ?? []).map((s) => wrap('grid', s.id) as ScriptGridStyle),

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

    importStyleByKeyAsync: async (): Promise<never> => {
      throw new ValidationErr(
        'UNSUPPORTED_OPERATION',
        'importStyleByKeyAsync is not supported in headless-figma-clone (no Figma team libraries)'
      );
    },
  };
}
