import { describe, expect, it } from 'vitest';
import { bufferPHashSimilarity } from '../../src/eval/renderService.js';

describe('visual stage 1 gates', () => {
  it('treats identical buffers as no visible change', () => {
    const buf = Buffer.from('png-bytes');
    expect(bufferPHashSimilarity(buf, buf)).toBe(1);
  });

  it('treats different buffers as visible change', () => {
    expect(bufferPHashSimilarity(Buffer.from('a'), Buffer.from('b'))).toBe(0);
  });
});
