import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const designPath = join(
  __dirname,
  '../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

const { JsonPersistence } = await import('../dist/persistence/JsonPersistence.js');
const { buildGraphIndexes } = await import('../dist/engine/nodeIndex.js');

function mb(n) {
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function snap(label) {
  if (global.gc) global.gc();
  console.log(`${label}: heapUsed=${mb(process.memoryUsage().heapUsed)}`);
}

snap('baseline');
const env = await new JsonPersistence().load({ path: designPath });
snap('after load');

const idx = buildGraphIndexes(env);
snap('after buildGraphIndexes');
console.log(`  index entries: ${idx.nodes.size}`);
console.log(`  parentById entries: ${idx.parentById.size}`);
console.log(`  componentSetByComponentId: ${idx.componentSetByComponentId.size}`);
