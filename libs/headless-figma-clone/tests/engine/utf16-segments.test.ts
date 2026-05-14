import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { validateStyledSegments } from '../../src/engine/utf16Segments.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('UTF-16 styled segments', () => {
  it('rejects overlapping segments', () => {
    expect(() =>
      validateStyledSegments('abcd', [
        { start: 0, end: 3, style: {} },
        { start: 2, end: 4, style: {} },
      ])
    ).toThrow(/overlapping/);
  });

  it('rejects out-of-bounds end', () => {
    expect(() => validateStyledSegments('ab', [{ start: 0, end: 5, style: {} }])).toThrow(/invalid/);
  });

  it('accepts adjacent non-overlapping segments', () => {
    expect(() =>
      validateStyledSegments('abcd', [
        { start: 0, end: 2, style: {} },
        { start: 2, end: 4, style: {} },
      ])
    ).not.toThrow();
  });

  it('rejects reversed range', () => {
    expect(() => validateStyledSegments('ab', [{ start: 1, end: 1, style: {} }])).toThrow(/invalid/);
  });
});

describe('engine transactional reject on bad segments', () => {
  it('applyTransaction rolls back on invalid styledSegments', async () => {
    const logger = createConsoleLogger('error');
    const persistence = new JsonPersistence();
    const engine = new DocumentEngine({ persistence, logger });
    await engine.createEmptyFile({ fileName: 'Seg' });
    await engine.applyTransaction([
      {
        op: 'createNode',
        parentId: 'I2',
        node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 10, height: 10, children: [] },
      },
    ]);
    const path = engine.getActiveFilePath()!;
    const before = await persistence.load({ path });
    const r = await engine.applyTransaction([
      {
        op: 'createNode',
        parentId: 'I3',
        node: {
          type: 'TEXT',
          name: 'T',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          characters: 'abcd',
          styledSegments: [
            { start: 0, end: 3, style: {} },
            { start: 2, end: 4, style: { fontSize: 9 } },
          ],
        },
      },
    ]);
    expect(r.success).toBe(false);
    const after = await persistence.load({ path });
    expect(after).toEqual(before);
  });
});
