import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { getLocalFontsFileBaseUrl } from '../../src/fonts/localFontRegistry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const okerDesignPath = join(
  __dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

describe('oker SegmentedControl Inspiration segment', () => {
  it('does not paint Default variant shell with Selected dark fill', () => {
    const envelope = JSON.parse(readFileSync(okerDesignPath, 'utf8'));
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I9714',
      options: {
        includeCss: true,
        inlineCss: true,
        fontBaseUrl: getLocalFontsFileBaseUrl(),
      },
    });

    const html = compiled.html;
    // Inspiration instance wrapper (component master slot 1429:68201) scoped Default root I48853.
    expect(html).toMatch(/\.hfc-node-I48863\b/);
    expect(html).not.toMatch(
      /\.hfc-node-I48863\s+\.hfc-node-I48853\{[^}]*background-color:rgba\(51,51,51,1\)/
    );
  });
});
