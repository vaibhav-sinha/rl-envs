/**
 * Reproduce OOM at 512MB heap like a constrained container.
 * node --max-old-space-size=512 --expose-gc scripts/profile-i1538-clone-512.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designPath = join(
  __dirname,
  '../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

const { DocumentEngine } = await import('../dist/engine/DocumentEngine.js');
const { runUseFigmaScript } = await import('../dist/mcp/useFigmaScript.js');
const { JsonPersistence } = await import('../dist/persistence/JsonPersistence.js');
const { createConsoleLogger } = await import('../dist/util/logger.js');

function mb(n) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function snap(label) {
  const m = process.memoryUsage();
  console.log(`${label}: heapUsed=${mb(m.heapUsed)} rss=${mb(m.rss)}`);
}

const CLONE_CODE = `
const page = figma.root.children.find(p => p.name === 'Final design');
await figma.setCurrentPageAsync(page);
const section = page.children.find(n => n.name === 'Onboarding');
const source = await figma.getNodeByIdAsync('I1538');
const clone = source.clone();
clone.name = 'Onboarding/OTP/MaxAttempts';
clone.x = 1313.25;
clone.y = 1533;
section.appendChild(clone);
return { createdNodeIds: [clone.id], id: clone.id };
`.trim();

async function main() {
  const persistence = new JsonPersistence();
  const tmpDir = mkdtempSync(join(tmpdir(), 'hfc-oom-'));
  const tmpPath = join(tmpDir, 'design.hfc.json');
  writeFileSync(tmpPath, readFileSync(designPath, 'utf8'));

  const engine = new DocumentEngine({
    persistence,
    logger: createConsoleLogger('error'),
  });

  snap('before load');
  await engine.loadFromDisk({ absolutePath: tmpPath, save: false });
  snap('after load');

  const run = await runUseFigmaScript(CLONE_CODE, engine);
  if (global.gc) global.gc();
  snap('after use_figma script');
  if (run.kind !== 'ok') throw new Error(run.message);

  if (global.gc) global.gc();
  console.log('committing pre-applied sandbox...');
  const envelope = run.committedWorking;
  const touched = run.touchedNodeIds;
  const preApplied = run.preApplied;
  const tx =
    preApplied && envelope
      ? await engine.commitEnvelope(envelope, { touchedNodeIds: touched })
      : await engine.applyTransaction(run.operations);
  snap('after commitEnvelope');
  console.log('tx', tx.success, tx.success ? tx.touchedNodeIds : tx.message);

  rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error('FAILED:', e.message || e);
  snap('on failure');
  process.exit(1);
});
