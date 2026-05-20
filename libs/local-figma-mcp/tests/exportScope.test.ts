import { afterEach, describe, expect, it, vi } from 'vitest';

type MockPage = { id: string; name: string; type: 'PAGE' };

function mockFigmaRoot(children: MockPage[]) {
  vi.stubGlobal('figma', {
    root: { children },
  });
}

describe('exportScope', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listFilePages returns page id and name', async () => {
    mockFigmaRoot([
      { id: '1:1', name: 'Cover', type: 'PAGE' },
      { id: '1:2', name: 'Flows', type: 'PAGE' },
    ]);
    const { listFilePages } = await import('../plugin/src/exportScope.js');
    expect(listFilePages()).toEqual([
      { id: '1:1', name: 'Cover' },
      { id: '1:2', name: 'Flows' },
    ]);
  });

  it('buildExportExcludeIds leaves exclude set unchanged when includePageIds is undefined', async () => {
    mockFigmaRoot([{ id: '1:1', name: 'A', type: 'PAGE' }]);
    const { buildExportExcludeIds } = await import('../plugin/src/exportScope.js');
    const exclude = buildExportExcludeIds(['frame-1'], undefined);
    expect([...exclude]).toEqual(['frame-1']);
  });

  it('buildExportExcludeIds adds unselected page ids to exclude set', async () => {
    mockFigmaRoot([
      { id: '1:1', name: 'A', type: 'PAGE' },
      { id: '1:2', name: 'B', type: 'PAGE' },
      { id: '1:3', name: 'C', type: 'PAGE' },
    ]);
    const { buildExportExcludeIds } = await import('../plugin/src/exportScope.js');
    const exclude = buildExportExcludeIds(['frame-1'], ['1:1', '1:3']);
    expect([...exclude].sort()).toEqual(['1:2', 'frame-1'].sort());
  });

  it('buildExportExcludeIds throws when includePageIds is empty', async () => {
    mockFigmaRoot([{ id: '1:1', name: 'A', type: 'PAGE' }]);
    const { buildExportExcludeIds } = await import('../plugin/src/exportScope.js');
    expect(() => buildExportExcludeIds(undefined, [])).toThrow(/no pages selected/);
  });
});
