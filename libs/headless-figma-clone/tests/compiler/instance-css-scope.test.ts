import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('component instance CSS scoping', () => {
  it('scopes cloned master node rules under each instance wrapper', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/component-instance-css-scope.hfc.json'), 'utf8')
    ) as FileEnvelope;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    const blob = out.css;
    expect(blob).toContain('.hfc-node-I10 .hfc-node-I101{');
    expect(blob).toContain('.hfc-node-I11 .hfc-node-I101{');
    expect(blob).toMatch(/\.hfc-node-I10 \.hfc-node-I101\{[^}]*width:80px/);
    expect(blob).toMatch(/\.hfc-node-I11 \.hfc-node-I101\{[^}]*width:200px/);
  });
});
