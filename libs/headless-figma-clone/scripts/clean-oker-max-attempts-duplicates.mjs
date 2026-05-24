/**
 * Remove stacked Onboarding/OTP/MaxAttempts frames from the oker task fixture.
 * Run from repo root: node libs/headless-figma-clone/scripts/clean-oker-max-attempts-duplicates.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designPath = join(
  __dirname,
  '../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

const envelope = JSON.parse(readFileSync(designPath, 'utf8'));
let removed = 0;

for (const page of envelope.document.children ?? []) {
  if (page.type !== 'PAGE') continue;
  for (const node of page.children ?? []) {
    if (node.type !== 'SECTION' || node.name !== 'Onboarding') continue;
    const before = node.children?.length ?? 0;
    node.children = (node.children ?? []).filter(
      (c) => !(c.type === 'FRAME' && c.name === 'Onboarding/OTP/MaxAttempts')
    );
    removed += before - node.children.length;
  }
}

writeFileSync(designPath, `${JSON.stringify(envelope)}\n`, 'utf8');
console.log(`Removed ${String(removed)} Onboarding/OTP/MaxAttempts frame(s) from ${designPath}`);
