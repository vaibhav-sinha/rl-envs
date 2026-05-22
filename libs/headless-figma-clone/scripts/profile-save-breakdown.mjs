/**
 * Break down applyTransaction memory: deepClone vs stringify vs save write.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designPath = join(
  __dirname,
  '../../../envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json'
);

const { DocumentEngine } = await import('../dist/engine/DocumentEngine.js');
const { runUseFigmaScript } = await import('../dist/mcp/useFigmaScript.js');
const { applyEngineOp } = await import('../dist/engine/DocumentEngine.js');
const { JsonPersistence } = await import('../dist/persistence/JsonPersistence.js');
const { createConsoleLogger } = await import('../dist/util/logger.js');

function mb(n) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function snap(label) {
  if (global.gc) global.gc();
  const m = process.memoryUsage();
  console.log(`${label}: heapUsed=${mb(m.heapUsed)} rss=${mb(m.rss)}`);
  return m.heapUsed;
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
  const tmpDir = mkdtempSync(join(tmpdir(), 'hfc-brk-'));
  const tmpPath = join(tmpDir, 'design.hfc.json');
  writeFileSync(tmpPath, readFileSync(designPath, 'utf8'));

  const engine = new DocumentEngine({
    persistence,
    logger: createConsoleLogger('error'),
  });
  await engine.loadFromDisk({ absolutePath: tmpPath, save: false });
  snap('1 loaded activeFile');

  const run = await runUseFigmaScript(CLONE_CODE, engine);
  if (run.kind !== 'ok') throw new Error(run.message);
  snap('2 after use_figma (ops queued, sandbox may own working copy)');

  const active = engine.getActiveFile();
  const ops = run.operations;

  // Manual applyTransaction phases
  snap('3 before working = structuredClone(active)');
  const t0 = process.memoryUsage().heapUsed;
  const working = structuredClone(active);
  if (global.gc) global.gc();
  snap(`4 after structuredClone (delta ${mb(process.memoryUsage().heapUsed - t0)})`);

  for (const op of ops) {
    applyEngineOp(working, op);
  }
  snap('5 after applyEngineOp loop (108-node clone applied)');

  const t1 = process.memoryUsage().heapUsed;
  const serialized = JSON.stringify(working, null, 2);
  if (global.gc) global.gc();
  const t2 = process.memoryUsage().heapUsed;
  console.log(`6 JSON.stringify: output length ${mb(serialized.length)}, heap delta ${mb(t2 - t1)}`);
  snap('7 after stringify (string still referenced)');

  void serialized; // drop ref
  if (global.gc) global.gc();
  snap('8 after dropping stringify result');

  rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
