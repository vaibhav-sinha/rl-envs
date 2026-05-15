import { describe, expect, it } from 'vitest';
import type { EngineOperation } from '../../src/engine/DocumentEngine.js';
import { createStylesApi } from '../../src/styles/StylesAPI.js';
import { emptyEnvelope } from '../helpers/envelope.js';

describe('createStylesApi', () => {
  it('creates paint and text styles via API wrappers', () => {
    const working = emptyEnvelope();
    const ops: EngineOperation[] = [];
    const api = createStylesApi({ working, ops });
    const paint = (api.createPaintStyle as () => { id: string; name: string })();
    expect(working.paintStyles?.some((s) => s.id === paint.id)).toBe(true);
    paint.name = 'Brand / Primary';
    expect(working.paintStyles?.find((s) => s.id === paint.id)?.name).toBe('Brand / Primary');

    const text = (api.createTextStyle as () => { id: string; fontSize: number })();
    expect(working.textStyles?.some((s) => s.id === text.id)).toBe(true);
    text.fontSize = 24;
    expect(working.textStyles?.find((s) => s.id === text.id)?.fontSize).toBe(24);
    expect(ops.some((o) => o.op === 'createPaintStyle')).toBe(true);
    expect(ops.some((o) => o.op === 'createTextStyle')).toBe(true);
    expect(ops.some((o) => o.op === 'updateTextStyle' && o.patch.fontSize === 24)).toBe(true);
  });

  it('createEffectStyle and createGridStyle register on envelope', () => {
    const working = emptyEnvelope();
    const ops: EngineOperation[] = [];
    const api = createStylesApi({ working, ops });
    const effect = (api.createEffectStyle as () => { id: string })();
    const grid = (api.createGridStyle as () => { id: string })();
    expect(working.effectStyles?.some((s) => s.id === effect.id)).toBe(true);
    expect(working.gridStyles?.some((s) => s.id === grid.id)).toBe(true);
  });

  it('moveLocalPaintStyleAfter reorders via API', () => {
    const working = { ...emptyEnvelope(), paintStyles: [] };
    const ops: EngineOperation[] = [];
    const api = createStylesApi({ working, ops });
    const a = (api.createPaintStyle as () => { id: string })();
    const b = (api.createPaintStyle as () => { id: string })();
    (api.moveLocalPaintStyleAfter as (t: { id: string }, r: { id: string } | null) => void)(b, null);
    expect(working.paintStyles!.map((s) => s.id)).toEqual([b.id, a.id]);
  });
});
