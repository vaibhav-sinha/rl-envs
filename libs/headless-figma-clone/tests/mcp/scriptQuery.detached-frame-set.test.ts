import { describe, expect, it } from 'vitest';
import { applyDetachedFrameSetProps } from '../../src/mcp/scriptQuery.js';
import { ValidationErr } from '../../src/util/errors.js';

describe('applyDetachedFrameSetProps', () => {
  it('applies layout props and routes width/height through resize', () => {
    const frame = {
      type: 'FRAME' as const,
      width: 100,
      height: 100,
      layoutMode: 'HORIZONTAL' as const,
      resize(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.primaryAxisSizingMode = 'FIXED';
        this.counterAxisSizingMode = 'FIXED';
      },
      primaryAxisSizingMode: 'AUTO' as const,
      counterAxisSizingMode: 'AUTO' as const,
    };
    applyDetachedFrameSetProps(frame, {
      name: 'Banner',
      itemSpacing: 8,
      paddingLeft: 16,
      width: 240,
      height: 48,
    });
    expect(frame.name).toBe('Banner');
    expect(frame.itemSpacing).toBe(8);
    expect(frame.paddingLeft).toBe(16);
    expect(frame.width).toBe(240);
    expect(frame.height).toBe(48);
    expect(frame.primaryAxisSizingMode).toBe('FIXED');
  });

  it('rejects unsupported patch keys', () => {
    const frame = {
      width: 10,
      height: 10,
      resize() {},
    };
    expect(() => applyDetachedFrameSetProps(frame, { notARealField: 1 })).toThrow(ValidationErr);
  });
});
