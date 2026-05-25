/**
 * Capture golden compile hash for oker sale section (1655:195069).
 * Run after build: node scripts/capture-oker-golden.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designPath = join(
  __dirname,
  '../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);
const outPath = join(__dirname, '../tests/fixtures/oker-sale-section-golden.hash');

const { resolveHfcNodeIdBySourceFigmaId } = await import('../dist/resolveNodeRef.js');
const { designCompiler } = await import('../dist/render/DesignCompiler.js');
const { getLocalFontsFileBaseUrl } = await import('../dist/fonts/localFontRegistry.js');
const envelope = JSON.parse(readFileSync(designPath, 'utf8'));
const rootId = resolveHfcNodeIdBySourceFigmaId(envelope, '1655:195069');
if (!rootId) {
  console.error('Node 1655:195069 not found');
  process.exit(1);
}

/** Golden is the legacy compile-clone path (Phase 0 baseline). Overlay must match this hash. */
const compiled = designCompiler.compileSubtree({
  envelope,
  rootNodeId: rootId,
  options: {
    viewportPaddingPx: 0,
    includeCss: true,
    inlineCss: true,
    fontBaseUrl: getLocalFontsFileBaseUrl(),
  },
});

function snapshotKey(c) {
  const warnings = [...c.warnings].sort();
  return createHash('sha256')
    .update(JSON.stringify({ html: c.html, css: c.css, warnings }))
    .digest('hex');
}

const hash = snapshotKey(compiled);
writeFileSync(outPath, `${hash}\n`, 'utf8');
console.log(`rootId=${rootId}`);
console.log(`golden=${hash}`);
console.log(`wrote ${outPath}`);
