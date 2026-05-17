import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runEval } from '../../src/eval/run.js';
import { loadFixture } from './helpers.js';

describe('hfc eval run integration', () => {
  it('runs deterministic eval without LLM', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hfc-eval-test-'));
    const beforePath = join(dir, 'before.hfc.json');
    const afterPath = join(dir, 'after.hfc.json');
    const specPath = join(dir, 'eval-spec.json');
    const reportPath = join(dir, 'report.json');

    const before = loadFixture('minimal', 'before');
    const after = loadFixture('add-frame', 'after');
    await writeFile(beforePath, JSON.stringify(before));
    await writeFile(afterPath, JSON.stringify(after));
    await writeFile(
      specPath,
      JSON.stringify({
        schema_version: 1,
        gates: { require_change: true },
        checks: [{ id: 'added', type: 'min_added_under', parent_id: 'I2', min: 1 }],
      })
    );

    const report = await runEval({
      beforePath,
      afterPath,
      specPath,
      reportPath,
      skipLlm: true,
      workDir: join(dir, 'work'),
    });

    expect(report.score).toBeGreaterThan(0);
    const onDisk = JSON.parse(await readFile(reportPath, 'utf8'));
    expect(onDisk.subchecks.length).toBeGreaterThan(0);
  });
});
