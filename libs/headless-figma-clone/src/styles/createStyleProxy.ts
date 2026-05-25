import type { EngineOperation } from '../engine/DocumentEngine.js';
import { applyEnvelopeOperation, type EnvelopeOperation } from '../engine/envelopeOps.js';
import type { GraphIndexes } from '../engine/nodeIndex.js';
import type {
  Effect,
  EffectStyleDefinition,
  FileEnvelope,
  FontName,
  GridStyleDefinition,
  LayoutGridColumns,
  Paint,
  PaintStyleDefinition,
  TextBoundVariableField,
  TextStyleDefinition,
} from '../model/types.js';
import { HFC_STYLE_FLAG, HFC_STYLE_MARKER } from '../mcp/scriptNodeSnapshot.js';
import { findVariableDefinition } from '../variables/resolution.js';
import { ValidationErr } from '../util/errors.js';
import { collectStyleConsumerEntries } from './styleConsumers.js';
import { FIGMA_STYLE_TYPE, type StyleRoute } from './styleTypes.js';

export type StylesScriptCtx = {
  working: FileEnvelope;
  ops: EngineOperation[];
  graphIndexes: GraphIndexes;
  getNodeHandle: (nodeId: string) => unknown;
  onMutate?: () => void;
};

type StyleProxyTarget = {
  id: string;
  styleRoute: StyleRoute;
  [HFC_STYLE_MARKER]: true;
  [HFC_STYLE_FLAG]: true;
};

function queueEnv(ctx: StylesScriptCtx, op: EnvelopeOperation): void {
  ctx.onMutate?.();
  ctx.ops.push(op);
  applyEnvelopeOperation(ctx.working, op);
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

function deleteOpForRoute(route: StyleRoute): EnvelopeOperation['op'] {
  switch (route) {
    case 'paint':
      return 'deletePaintStyle';
    case 'text':
      return 'deleteTextStyle';
    case 'effect':
      return 'deleteEffectStyle';
    case 'grid':
      return 'deleteGridStyle';
  }
}

function updateOpForRoute(route: StyleRoute): EnvelopeOperation['op'] {
  switch (route) {
    case 'paint':
      return 'updatePaintStyle';
    case 'text':
      return 'updateTextStyle';
    case 'effect':
      return 'updateEffectStyle';
    case 'grid':
      return 'updateGridStyle';
  }
}

function validateFontName(value: unknown): FontName {
  if (!value || typeof value !== 'object') {
    throw new ValidationErr('VALIDATION_ERROR', 'fontName must be an object with family and style');
  }
  const o = value as { family?: unknown; style?: unknown };
  if (typeof o.family !== 'string' || typeof o.style !== 'string') {
    throw new ValidationErr('VALIDATION_ERROR', 'fontName must be an object with family and style');
  }
  return { family: o.family, style: o.style };
}

function bindVariableToTextStyle(
  ctx: StylesScriptCtx,
  styleId: string,
  field: TextBoundVariableField,
  variable: { id: string } | null
): void {
  const s = findTextStyle(ctx.working, styleId);
  if (!s) throw new ValidationErr('VALIDATION_ERROR', `Unknown text style ${styleId}`);

  const textFloat = new Set(['fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent']);
  const textString = new Set(['fontFamily', 'fontStyle', 'characters']);

  const bv = { ...(s.boundVariables ?? {}) };
  if (variable === null) {
    delete bv[field];
  } else {
    const hit = findVariableDefinition(ctx.working, variable.id);
    if (!hit) throw new ValidationErr('VALIDATION_ERROR', `Unknown variable ${variable.id}`);
    if (textFloat.has(field) && hit.variable.resolvedType !== 'FLOAT') {
      throw new ValidationErr('VALIDATION_ERROR', `Field ${field} requires FLOAT variable`);
    }
    if (textString.has(field) && hit.variable.resolvedType !== 'STRING') {
      throw new ValidationErr('VALIDATION_ERROR', `Field ${field} requires STRING variable`);
    }
    bv[field] = variable.id;
  }
  queueEnv(ctx, {
    op: 'updateTextStyle',
    id: styleId,
    patch: { boundVariables: Object.keys(bv).length ? bv : undefined },
  });
}

function stylePluginDataGet(s: { pluginData?: Record<string, string> }, key: string): string {
  return s.pluginData?.[key] ?? '';
}

function stylePluginDataSet(
  ctx: StylesScriptCtx,
  route: StyleRoute,
  id: string,
  key: string,
  value: string
): void {
  const op = updateOpForRoute(route);
  const find =
    route === 'paint'
      ? findPaintStyle
      : route === 'text'
        ? findTextStyle
        : route === 'effect'
          ? findEffectStyle
          : findGridStyle;
  const s = find(ctx.working, id);
  if (!s) return;
  const pluginData = { ...(s.pluginData ?? {}), [key]: value };
  queueEnv(ctx, { op, id, patch: { pluginData } } as EnvelopeOperation);
}

function styleSharedPluginDataGet(
  s: { sharedPluginData?: Record<string, Record<string, string>> },
  namespace: string,
  key: string
): string {
  return s.sharedPluginData?.[namespace]?.[key] ?? '';
}

function styleSharedPluginDataSet(
  ctx: StylesScriptCtx,
  route: StyleRoute,
  id: string,
  namespace: string,
  key: string,
  value: string
): void {
  const op = updateOpForRoute(route);
  const find =
    route === 'paint'
      ? findPaintStyle
      : route === 'text'
        ? findTextStyle
        : route === 'effect'
          ? findEffectStyle
          : findGridStyle;
  const s = find(ctx.working, id);
  if (!s) return;
  const ns = { ...(s.sharedPluginData?.[namespace] ?? {}), [key]: value };
  const sharedPluginData = { ...(s.sharedPluginData ?? {}), [namespace]: ns };
  queueEnv(ctx, { op, id, patch: { sharedPluginData } } as EnvelopeOperation);
}

const TEXT_WRITABLE = new Set([
  'name',
  'fontName',
  'fontSize',
  'fontWeight',
  'fills',
  'textDecoration',
  'letterSpacing',
  'lineHeight',
  'leadingTrim',
  'paragraphIndent',
  'paragraphSpacing',
  'listSpacing',
  'hangingPunctuation',
  'hangingList',
  'textCase',
  'description',
  'descriptionMarkdown',
]);

function applyStyleSet(
  ctx: StylesScriptCtx,
  route: StyleRoute,
  id: string,
  prop: string,
  value: unknown
): boolean {
  if (route === 'paint') {
    if (prop === 'name' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updatePaintStyle', id, patch: { name: value } });
      return true;
    }
    if (prop === 'paints' && Array.isArray(value)) {
      queueEnv(ctx, { op: 'updatePaintStyle', id, patch: { paints: value as Paint[] } });
      return true;
    }
    if (prop === 'description' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updatePaintStyle', id, patch: { description: value } });
      return true;
    }
    if (prop === 'descriptionMarkdown' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updatePaintStyle', id, patch: { descriptionMarkdown: value } });
      return true;
    }
    return false;
  }
  if (route === 'text') {
    if (!TEXT_WRITABLE.has(prop)) return false;
    if (prop === 'fontName') {
      queueEnv(ctx, { op: 'updateTextStyle', id, patch: { fontName: validateFontName(value) } });
      return true;
    }
    if (prop === 'hangingPunctuation' || prop === 'hangingList') {
      queueEnv(ctx, { op: 'updateTextStyle', id, patch: { [prop]: Boolean(value) } });
      return true;
    }
    if (prop === 'fills' && Array.isArray(value)) {
      queueEnv(ctx, { op: 'updateTextStyle', id, patch: { fills: value as Paint[] } });
      return true;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'object') {
      queueEnv(ctx, { op: 'updateTextStyle', id, patch: { [prop]: value } as Partial<TextStyleDefinition> });
      return true;
    }
    return false;
  }
  if (route === 'effect') {
    if (prop === 'name' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updateEffectStyle', id, patch: { name: value } });
      return true;
    }
    if (prop === 'effects' && Array.isArray(value)) {
      queueEnv(ctx, { op: 'updateEffectStyle', id, patch: { effects: value as Effect[] } });
      return true;
    }
    if (prop === 'description' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updateEffectStyle', id, patch: { description: value } });
      return true;
    }
    if (prop === 'descriptionMarkdown' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updateEffectStyle', id, patch: { descriptionMarkdown: value } });
      return true;
    }
    return false;
  }
  if (route === 'grid') {
    if (prop === 'name' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updateGridStyle', id, patch: { name: value } });
      return true;
    }
    if (prop === 'layoutGrids' && Array.isArray(value)) {
      queueEnv(ctx, { op: 'updateGridStyle', id, patch: { layoutGrids: value as LayoutGridColumns[] } });
      return true;
    }
    if (prop === 'description' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updateGridStyle', id, patch: { description: value } });
      return true;
    }
    if (prop === 'descriptionMarkdown' && typeof value === 'string') {
      queueEnv(ctx, { op: 'updateGridStyle', id, patch: { descriptionMarkdown: value } });
      return true;
    }
    return false;
  }
  return false;
}

function getStyleRecord(
  ctx: StylesScriptCtx,
  route: StyleRoute,
  id: string
): PaintStyleDefinition | TextStyleDefinition | EffectStyleDefinition | GridStyleDefinition | null {
  switch (route) {
    case 'paint':
      return findPaintStyle(ctx.working, id);
    case 'text':
      return findTextStyle(ctx.working, id);
    case 'effect':
      return findEffectStyle(ctx.working, id);
    case 'grid':
      return findGridStyle(ctx.working, id);
  }
}

function styleMethod(
  ctx: StylesScriptCtx,
  route: StyleRoute,
  id: string,
  prop: string | symbol
): unknown {
  if (prop === 'remove') {
    return (): void => {
      queueEnv(ctx, { op: deleteOpForRoute(route), id } as EnvelopeOperation);
    };
  }
  if (prop === 'getStyleConsumersAsync') {
    return async (): Promise<Array<{ node: unknown; fields: string[] }>> => {
      const entries = collectStyleConsumerEntries(ctx.graphIndexes, id);
      return entries.map((e) => ({
        node: ctx.getNodeHandle(e.nodeId),
        fields: e.fields,
      }));
    };
  }
  if (prop === 'setBoundVariable') {
    if (route !== 'text') return undefined;
    return (field: TextBoundVariableField, variable: { id: string } | null): void => {
      bindVariableToTextStyle(ctx, id, field, variable);
    };
  }
  if (prop === 'getPublishStatusAsync') {
    return async (): Promise<'UNPUBLISHED'> => 'UNPUBLISHED';
  }
  if (prop === 'getPluginData') {
    return (key: string): string => {
      const s = getStyleRecord(ctx, route, id);
      return s ? stylePluginDataGet(s, key) : '';
    };
  }
  if (prop === 'setPluginData') {
    return (key: string, value: string): void => {
      stylePluginDataSet(ctx, route, id, key, value);
    };
  }
  if (prop === 'getPluginDataKeys') {
    return (): string[] => {
      const s = getStyleRecord(ctx, route, id);
      return s?.pluginData ? Object.keys(s.pluginData) : [];
    };
  }
  if (prop === 'getSharedPluginData') {
    return (namespace: string, key: string): string => {
      const s = getStyleRecord(ctx, route, id);
      return s ? styleSharedPluginDataGet(s, namespace, key) : '';
    };
  }
  if (prop === 'setSharedPluginData') {
    return (namespace: string, key: string, value: string): void => {
      styleSharedPluginDataSet(ctx, route, id, namespace, key, value);
    };
  }
  if (prop === 'getSharedPluginDataKeys') {
    return (namespace: string): string[] => {
      const s = getStyleRecord(ctx, route, id);
      const ns = s?.sharedPluginData?.[namespace];
      return ns ? Object.keys(ns) : [];
    };
  }
  return undefined;
}

export function createStyleProxy(ctx: StylesScriptCtx, styleRoute: StyleRoute, id: string): unknown {
  const target: StyleProxyTarget = {
    id,
    styleRoute,
    [HFC_STYLE_MARKER]: true,
    [HFC_STYLE_FLAG]: true,
  };

  return new Proxy(target, {
    get(_t, prop) {
      if (prop === 'id') return id;
      if (prop === HFC_STYLE_MARKER || prop === HFC_STYLE_FLAG) return true;
      if (prop === 'type') return FIGMA_STYLE_TYPE[styleRoute];
      if (prop === 'consumers') {
        throw new Error(
          'Access to property "consumers" is deprecated. Please use getStyleConsumersAsync instead. ' +
            'If the plugin manifest contains "documentAccess": "dynamic-page", this property throws.'
        );
      }
      if (prop === 'remote') return false;
      if (prop === 'key') {
        const s = getStyleRecord(ctx, styleRoute, id);
        return s?.key ?? id;
      }
      if (prop === 'description') {
        const s = getStyleRecord(ctx, styleRoute, id);
        return s?.description ?? '';
      }
      if (prop === 'descriptionMarkdown') {
        const s = getStyleRecord(ctx, styleRoute, id);
        return s?.descriptionMarkdown ?? '';
      }
      if (prop === 'documentationLinks') return [];

      const method = styleMethod(ctx, styleRoute, id, prop);
      if (method !== undefined) return method;

      const rec = getStyleRecord(ctx, styleRoute, id);
      if (!rec) return undefined;
      return (rec as unknown as Record<string, unknown>)[prop as string];
    },
    set(_t, prop, value) {
      if (prop === 'key' || prop === 'remote') return false;
      return applyStyleSet(ctx, styleRoute, id, String(prop), value);
    },
  });
}

export { findPaintStyle, findTextStyle, findEffectStyle, findGridStyle };
