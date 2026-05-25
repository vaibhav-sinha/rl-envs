import { describe, expect, it } from 'vitest';
import type { EngineOperation } from '../../src/engine/DocumentEngine.js';
import { buildGraphIndexes } from '../../src/engine/nodeIndex.js';
import { createStylesApi } from '../../src/styles/StylesAPI.js';
import { emptyEnvelope } from '../helpers/envelope.js';

function makeApi(working = emptyEnvelope()) {
  const ops: EngineOperation[] = [];
  return {
    working,
    ops,
    api: createStylesApi({
      working,
      ops,
      graphIndexes: buildGraphIndexes(working),
      getNodeHandle: (id) => ({ id, __hfcHandle: true }),
    }),
  };
}

describe('createStylesApi', () => {
  it('creates paint and text styles via API wrappers', () => {
    const { working, ops, api } = makeApi();
    const paint = (api.createPaintStyle as () => { id: string; name: string; type: string })();
    expect(paint.type).toBe('PAINT');
    expect((paint as { kind?: string }).kind).toBeUndefined();
    expect(working.paintStyles?.some((s) => s.id === paint.id)).toBe(true);
    paint.name = 'Brand / Primary';
    expect(working.paintStyles?.find((s) => s.id === paint.id)?.name).toBe('Brand / Primary');

    const text = (api.createTextStyle as () => { id: string; type: string; fontSize: number; fontName: { family: string; style: string } })();
    expect(text.type).toBe('TEXT');
    expect((text as { kind?: string }).kind).toBeUndefined();
    expect(working.textStyles?.some((s) => s.id === text.id)).toBe(true);
    text.fontSize = 24;
    text.fontName = { family: 'Barlow', style: 'SemiBold' };
    expect(working.textStyles?.find((s) => s.id === text.id)?.fontSize).toBe(24);
    expect(working.textStyles?.find((s) => s.id === text.id)?.fontName).toEqual({
      family: 'Barlow',
      style: 'SemiBold',
    });
    expect(ops.some((o) => o.op === 'createPaintStyle')).toBe(true);
    expect(ops.some((o) => o.op === 'createTextStyle')).toBe(true);
    expect(ops.some((o) => o.op === 'updateTextStyle' && o.patch.fontSize === 24)).toBe(true);
  });

  it('effect and grid styles expose type via getStyleById', async () => {
    const { api } = makeApi();
    const effect = (api.createEffectStyle as () => { id: string })();
    const grid = (api.createGridStyle as () => { id: string })();
    const eff = await (api.getStyleByIdAsync as (id: string) => Promise<{ type: string }>)(effect.id);
    const gr = await (api.getStyleByIdAsync as (id: string) => Promise<{ type: string }>)(grid.id);
    expect(eff?.type).toBe('EFFECT');
    expect(gr?.type).toBe('GRID');
  });

  it('getStyleByIdAsync filters by style.type === TEXT', async () => {
    const { api } = makeApi();
    const text = (api.createTextStyle as () => { id: string })();
    const style = await (api.getStyleByIdAsync as (id: string) => Promise<{ type?: string; fontName?: { family: string } } | null>)(
      text.id
    );
    expect(style?.type === 'TEXT').toBe(true);
    expect(style?.fontName?.family).toBe('Inter');
  });

  it('remove() deletes local text style from envelope', () => {
    const { working, api } = makeApi();
    const text = (api.createTextStyle as () => { id: string; remove: () => void })();
    expect(working.textStyles?.some((s) => s.id === text.id)).toBe(true);
    text.remove();
    expect(working.textStyles?.some((s) => s.id === text.id)).toBe(false);
  });

  it('createEffectStyle and createGridStyle register on envelope', () => {
    const { working, ops, api } = makeApi();
    const effect = (api.createEffectStyle as () => { id: string })();
    const grid = (api.createGridStyle as () => { id: string })();
    expect(working.effectStyles?.some((s) => s.id === effect.id)).toBe(true);
    expect(working.gridStyles?.some((s) => s.id === grid.id)).toBe(true);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('moveLocalPaintStyleAfter reorders via API', () => {
    const working = { ...emptyEnvelope(), paintStyles: [] };
    const ops: EngineOperation[] = [];
    const api = createStylesApi({
      working,
      ops,
      graphIndexes: buildGraphIndexes(working),
      getNodeHandle: (id) => ({ id }),
    });
    const a = (api.createPaintStyle as () => { id: string })();
    const b = (api.createPaintStyle as () => { id: string })();
    (api.moveLocalPaintStyleAfter as (t: { id: string }, r: { id: string } | null) => void)(b, null);
    expect(working.paintStyles!.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it('consumers getter throws with dynamic-page message', () => {
    const { api } = makeApi();
    const paint = (api.createPaintStyle as () => Record<string, unknown>)();
    expect(() => paint.consumers).toThrow(/getStyleConsumersAsync/);
  });
});
