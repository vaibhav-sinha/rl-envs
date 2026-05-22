import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope, PageNode, TextNode } from '../../src/model/types.js';

function compileText(t: TextNode): { html: string; css: string } {
  const page: PageNode = {
    id: 'p',
    type: 'PAGE',
    name: 'p',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    children: [t],
  };
  const env: FileEnvelope = {
    schemaVersion: 1,
    fileKey: 'k',
    fileName: 'f',
    nextInternalId: 2,
    document: { id: 'd', type: 'DOCUMENT', name: 'd', children: [page] },
  };
  return designCompiler.compileSubtree({
    envelope: env,
    rootNodeId: t.id,
    options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
  });
}

function baseText(overrides: Partial<TextNode> & Pick<TextNode, 'characters'>): TextNode {
  return {
    id: 't1',
    type: 'TEXT',
    name: 'body',
    x: 0,
    y: 0,
    width: 200,
    height: 80,
    textAutoResize: 'HEIGHT',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    fontSize: 14,
    lineHeight: { unit: 'PIXELS', value: 20 },
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
    ...overrides,
  };
}

describe('paragraph spacing (Tier 1)', () => {
  it('single paragraph has no hfc-text-paras wrapper', () => {
    const { html } = compileText(baseText({ characters: 'One line only' }));
    expect(html).not.toContain('hfc-text-paras');
    expect(html).not.toContain('hfc-para');
  });

  it('three paragraphs use flex gap between paras, not after the last', () => {
    const { html, css } = compileText(
      baseText({ characters: 'First\nSecond\nThird', paragraphSpacing: 10 })
    );
    expect(html).toContain('hfc-text-paras');
    expect(html).toContain('gap:10px');
    expect(html.match(/class="hfc-para"/g)?.length).toBe(3);
    expect(html).toContain('First');
    expect(html).toContain('Second');
    expect(html).toContain('Third');
    expect(css + html).not.toMatch(/margin-bottom:10px/);
  });

  it('applies paragraphIndent on each paragraph block', () => {
    const { html } = compileText(
      baseText({ characters: 'A\nB', paragraphSpacing: 8, paragraphIndent: 12 })
    );
    expect(html).toMatch(/hfc-para[^>]*text-indent:12px/);
  });

  it('U+2028 line separator stays one paragraph (no inter-para gap)', () => {
    const { html, css } = compileText(
      baseText({
        characters: 'We texted you a one time code to \u2028+91 9930444877.',
        width: 328,
        height: 40,
        paragraphSpacing: 8,
        fontSize: 16,
        lineHeight: { unit: 'PIXELS', value: 20 },
      })
    );
    expect(html).not.toContain('hfc-text-paras');
    expect(html).not.toContain('hfc-para');
    expect(css).toMatch(/white-space:pre-wrap/);
    expect(css + html).not.toMatch(/gap:8px/);
  });

  it('single-line OTP-style text has no paragraph gap markup', () => {
    const { html, css } = compileText(
      baseText({
        characters: '1',
        width: 24,
        height: 20,
        paragraphSpacing: 8,
        textAlignHorizontal: 'CENTER',
        textAutoResize: 'HEIGHT',
      })
    );
    expect(html).not.toContain('hfc-text-paras');
    expect(css + html).not.toMatch(/margin-bottom:8px/);
  });
});
