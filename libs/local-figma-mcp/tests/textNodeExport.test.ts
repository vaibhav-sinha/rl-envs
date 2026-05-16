import { describe, expect, it } from 'vitest';
import { enrichTextNodeExport } from '../plugin/src/tools/textNodeExport.js';

describe('enrichTextNodeExport', () => {
  it('builds styledSegments from getStyledTextSegments', () => {
    const props: Record<string, unknown> = { characters: 'Hi' };
    const visited = new WeakSet<object>();
    const node = {
      type: 'TEXT',
      getStyledTextSegments(fields: string[]) {
        expect(fields).toContain('textDecoration');
        return [{ start: 0, end: 2, textDecoration: 'STRIKETHROUGH', fontSize: 14 }];
      },
    } as unknown as TextNode;
    enrichTextNodeExport(node, props, visited);
    expect(props.styledSegments).toEqual([
      {
        start: 0,
        end: 2,
        textDecoration: { type: 'STRIKETHROUGH' },
        fontSize: 14,
      },
    ]);
  });
});
