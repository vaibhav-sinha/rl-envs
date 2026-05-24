import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JsonPersistence } from '../src/persistence/JsonPersistence.js';
import { allocNodeId } from '../src/engine/DocumentEngine.js';
import { bumpNextInternalIdFromDocumentForBench } from './bench-node-id-assignment-lib.js';

const designPath = join(
  import.meta.dirname,
  '../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

function roundMs(ms: number): number {
  return Math.round(ms * 100) / 100;
}

async function main(): Promise<void> {
  const raw = readFileSync(designPath, 'utf8');

  let t0 = performance.now();
  const parsed = JSON.parse(raw) as { components?: unknown[]; nextInternalId?: number };
  const parseMs = performance.now() - t0;

  t0 = performance.now();
  const persistence = new JsonPersistence();
  const env = await persistence.load({ path: designPath });
  const loadMs = performance.now() - t0;

  t0 = performance.now();
  bumpNextInternalIdFromDocumentForBench(env);
  const bumpWalkMs = performance.now() - t0;

  t0 = performance.now();
  for (let i = 0; i < 1000; i++) {
    allocNodeId(env);
  }
  const alloc1000Ms = performance.now() - t0;

  t0 = performance.now();
  let localNext = env.nextInternalId;
  for (let i = 0; i < 1000; i++) {
    const id = `I${String(localNext++)}`;
    void id;
  }
  const reserve1000Ms = performance.now() - t0;

  console.log(
    JSON.stringify(
      {
        designPath,
        nextInternalId: env.nextInternalId,
        hasLegacyComponentsSidecar: Boolean(parsed.components?.length),
        parseMs: roundMs(parseMs),
        loadMs: roundMs(loadMs),
        bumpWalkMs: roundMs(bumpWalkMs),
        alloc1000Ms: roundMs(alloc1000Ms),
        perAllocUs: roundMs((alloc1000Ms / 1000) * 1000),
        reserveScriptStyle1000Ms: roundMs(reserve1000Ms),
        perReserveUs: roundMs((reserve1000Ms / 1000) * 1000),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
