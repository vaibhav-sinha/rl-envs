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

function queueEnv(ctx: { working: FileEnvelope; ops: EngineOperation[] }, op: EnvelopeOperation): void {
  ctx.ops.push(op);
  applyEnvelopeOperation(ctx.working, op);
}

function wrapPaintStyle(ctx: { working: FileEnvelope; ops: EngineOperation[] }, id: string): ScriptPaintStyle {
  return new Proxy({ id } as ScriptPaintStyle, {
    get(_t, prop) {
      if (prop === 'id') return id;
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
  });
}

function wrapTextStyle(ctx: { working: FileEnvelope; ops: EngineOperation[] }, id: string): ScriptTextStyle {
  return new Proxy({ id } as ScriptTextStyle, {
    get(_t, prop) {
      if (prop === 'id') return id;
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
  });
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

export function createStylesApi(ctx: { working: FileEnvelope; ops: EngineOperation[] }): Record<string, unknown> {
  const { working } = ctx;

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
      if (findPaintStyle(working, id)) return wrapPaintStyle(ctx, id);
      if (findTextStyle(working, id)) return wrapTextStyle(ctx, id);
      return findEffectStyle(working, id) ?? findGridStyle(working, id);
    },

    getStyleById: (id: string): ScriptPaintStyle | ScriptTextStyle | ScriptEffectStyle | ScriptGridStyle | null => {
      if (findPaintStyle(working, id)) return wrapPaintStyle(ctx, id);
      if (findTextStyle(working, id)) return wrapTextStyle(ctx, id);
      return findEffectStyle(working, id) ?? findGridStyle(working, id);
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
      return findEffectStyle(working, id)!;
    },

    createGridStyle: (): ScriptGridStyle => {
      const id = ulid();
      queueEnv(ctx, {
        op: 'createGridStyle',
        id,
        name: 'Grid Style',
        layoutGrids: [{ type: 'COLUMNS', count: 12, gutter: 20 }],
      });
      return findGridStyle(working, id)!;
    },

    getLocalPaintStylesAsync: async (): Promise<ScriptPaintStyle[]> =>
      (working.paintStyles ?? []).map((s) => wrapPaintStyle(ctx, s.id)),
    getLocalPaintStyles: (): ScriptPaintStyle[] =>
      (working.paintStyles ?? []).map((s) => wrapPaintStyle(ctx, s.id)),
    getLocalTextStylesAsync: async (): Promise<ScriptTextStyle[]> =>
      (working.textStyles ?? []).map((s) => wrapTextStyle(ctx, s.id)),
    getLocalTextStyles: (): ScriptTextStyle[] =>
      (working.textStyles ?? []).map((s) => wrapTextStyle(ctx, s.id)),
    getLocalEffectStylesAsync: async (): Promise<ScriptEffectStyle[]> => [...(working.effectStyles ?? [])],
    getLocalEffectStyles: (): ScriptEffectStyle[] => [...(working.effectStyles ?? [])],
    getLocalGridStylesAsync: async (): Promise<ScriptGridStyle[]> => [...(working.gridStyles ?? [])],
    getLocalGridStyles: (): ScriptGridStyle[] => [...(working.gridStyles ?? [])],

    moveLocalPaintStyleAfter: (target: ScriptPaintStyle, reference: ScriptPaintStyle | null): void => {
      if (!findPaintStyle(working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown paint style ${target.id}`);
      moveAfter('paint', target, reference);
    },

    moveLocalTextStyleAfter: (target: ScriptTextStyle, reference: ScriptTextStyle | null): void => {
      if (!findTextStyle(working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown text style ${target.id}`);
      moveAfter('text', target, reference);
    },

    moveLocalEffectStyleAfter: (target: ScriptEffectStyle, reference: ScriptEffectStyle | null): void => {
      if (!findEffectStyle(working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown effect style ${target.id}`);
      moveAfter('effect', target, reference);
    },

    moveLocalGridStyleAfter: (target: ScriptGridStyle, reference: ScriptGridStyle | null): void => {
      if (!findGridStyle(working, target.id)) throw new ValidationErr('VALIDATION_ERROR', `Unknown grid style ${target.id}`);
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
