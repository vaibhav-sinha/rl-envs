/**
 * Profile memory for I1538 clone path (same as failed agent use_figma).
 * Run: node --expose-gc scripts/profile-i1538-clone.mjs
 * Optional: node --max-old-space-size=512 --expose-gc ... to test OOM threshold
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import v8 from 'node:v8';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designPath = join(
  __dirname,
  '../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

const { DocumentEngine } = await import('../dist/engine/DocumentEngine.js');
const { runUseFigmaScript } = await import('../dist/mcp/useFigmaScript.js');
const { JsonPersistence } = await import('../dist/persistence/JsonPersistence.js');
const { cloneSceneSubtreeWithNewIds } = await import('../dist/engine/DocumentEngine.js');
const { createConsoleLogger } = await import('../dist/util/logger.js');

function mb(n) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function snap(label) {
  if (global.gc) global.gc();
  const m = process.memoryUsage();
  const h = v8.getHeapStatistics();
  console.log(`\n=== ${label} ===`);
  console.log(`  rss:          ${mb(m.rss)}`);
  console.log(`  heapUsed:     ${mb(m.heapUsed)}`);
  console.log(`  heapTotal:    ${mb(m.heapTotal)}`);
  console.log(`  external:     ${mb(m.external)}`);
  console.log(`  arrayBuffers: ${mb(m.arrayBuffers)}`);
  console.log(`  heap_size_limit: ${mb(h.heap_size_limit)}`);
  return { heapUsed: m.heapUsed, rss: m.rss };
}

function countNodes(node) {
  if (!node || typeof node !== 'object') return 0;
  let n = 1;
  const ch = node.children;
  if (Array.isArray(ch)) {
    for (const c of ch) n += countNodes(c);
  }
  return n;
}

function analyzeEnvelope(env, label) {
  const doc = env.document;
  let pages = 0;
  let sceneNodes = 0;
  let instances = 0;
  let instancesWithChildren = 0;
  let embeddedChildNodes = 0;

  function walk(n) {
    if (!n || typeof n !== 'object') return;
    sceneNodes++;
    if (n.type === 'INSTANCE') {
      instances++;
      if (Array.isArray(n.children) && n.children.length > 0) {
        instancesWithChildren++;
        for (const c of n.children) {
          embeddedChildNodes += countNodes(c);
        }
      }
    }
    if (Array.isArray(n.children)) {
      for (const c of n.children) walk(c);
    }
  }

  for (const p of doc?.children ?? []) {
    if (p.type === 'PAGE') {
      pages++;
      for (const c of p.children ?? []) walk(c);
    }
  }

  const assets = env.assets ?? {};
  const assetKeys = Object.keys(assets).length;
  let assetBytes = 0;
  for (const k of Object.keys(assets)) {
    const a = assets[k];
    if (a?.dataBase64) assetBytes += a.dataBase64.length;
    if (a?.path) assetBytes += 0; // external
  }

  console.log(`\n--- envelope stats: ${label} ---`);
  console.log(`  pages: ${pages}, scene nodes (walk): ${sceneNodes}`);
  console.log(`  instances: ${instances}, with embedded children: ${instancesWithChildren}`);
  console.log(`  nodes inside instance subtrees: ${embeddedChildNodes}`);
  console.log(`  asset records: ${assetKeys}, base64 chars: ${(assetBytes / 1e6).toFixed(1)}M`);
  console.log(`  variables: ${(env.variables?.length ?? 0)}`);
  console.log(`  styles: paint=${(env.paintStyles?.length ?? 0)} text=${(env.textStyles?.length ?? 0)}`);
}

function findNodeById(node, id) {
  if (!node || typeof node !== 'object') return null;
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNodeById(c, id);
    if (hit) return hit;
  }
  return null;
}

function findInDoc(doc, id) {
  for (const p of doc.children ?? []) {
    const hit = findNodeById(p, id);
    if (hit) return hit;
  }
  return null;
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
  const diskBytes = readFileSync(designPath).length;
  console.log(`Design file on disk: ${mb(diskBytes)}`);

  snap('baseline (empty process)');

  const raw = readFileSync(designPath, 'utf8');
  snap('after readFileSync (string in memory)');

  const parsed = JSON.parse(raw);
  snap('after JSON.parse');
  analyzeEnvelope(parsed, 'parsed');

  // Drop raw string to measure object-only footprint
  const rawLen = raw.length;
  globalThis.__raw = null;
  snap('after dropping raw string ref');

  const persistence = new JsonPersistence();
  const tmpDir = mkdtempSync(join(tmpdir(), 'hfc-profile-'));
  const tmpPath = join(tmpDir, 'design.hfc.json');
  writeFileSync(tmpPath, JSON.stringify(parsed, null, 2));

  const engine = new DocumentEngine({
    persistence,
    logger: createConsoleLogger('error'),
  });

  await engine.loadFromDisk({ absolutePath: tmpPath, save: false });
  snap('after engine.loadFromDisk (load + normalize)');

  const active = engine.getActiveFile();
  if (active) analyzeEnvelope(active, 'engine active');

  // Phase A: use_figma script only (sandbox deepClone on first mutate)
  const run = await runUseFigmaScript(CLONE_CODE, engine);
  snap('after runUseFigmaScript (sandbox + ops queued)');
  console.log(`  run.kind: ${run.kind}`);
  if (run.kind === 'error') {
    console.log(`  error: ${run.message}`);
    process.exit(1);
  }
  console.log(`  operations: ${run.operations.length}`);

  // Phase B: commitEnvelope (pre-applied sandbox; no second deepClone + replay)
  snap('before commitEnvelope');
  const tx =
    run.preApplied && run.committedWorking
      ? await engine.commitEnvelope(run.committedWorking, { touchedNodeIds: run.touchedNodeIds })
      : await engine.applyTransaction(run.operations);
  snap('after commitEnvelope (streamed save)');
  console.log(`  tx.success: ${tx.success}`);
  if (!tx.success) console.log(`  tx: ${tx.message}`);

  // Phase C: isolate cloneSceneSubtreeWithNewIds on fresh copy
  const fresh = structuredClone(active);
  snap('after structuredClone(active) for isolated test');
  const i1538 = findInDoc(fresh.document, 'I1538');
  if (i1538) {
    const subNodes = countNodes(i1538);
    console.log(`\nI1538 subtree nodes: ${subNodes}`);
    const t0 = process.memoryUsage().heapUsed;
    const cloned = cloneSceneSubtreeWithNewIds(fresh, i1538);
    if (global.gc) global.gc();
    const t1 = process.memoryUsage().heapUsed;
    console.log(`  cloneSceneSubtreeWithNewIds delta heap: ${mb(t1 - t0)}`);
    console.log(`  cloned id: ${cloned.id}, cloned subtree nodes: ${countNodes(cloned)}`);
    snap('after isolated subtree clone');
  }

  // Phase D: stringify cost alone
  const env2 = engine.getActiveFile();
  if (env2) {
    const t0 = process.memoryUsage().heapUsed;
    const out = JSON.stringify(env2, null, 2);
    if (global.gc) global.gc();
    const t1 = process.memoryUsage().heapUsed;
    console.log(`\nJSON.stringify(activeFile) output: ${mb(out.length)}`);
    console.log(`  stringify peak heap delta: ${mb(t1 - t0)}`);
    snap('after stringify (string may be collected)');
  }

  // Phase E: double deepClone like use_figma + applyTransaction
  const e1 = structuredClone(active);
  snap('deepClone #1 (simulate ensureWorkingCopy)');
  const e2 = structuredClone(e1);
  snap('deepClone #2 (simulate applyTransaction working copy)');

  rmSync(tmpDir, { recursive: true, force: true });
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
