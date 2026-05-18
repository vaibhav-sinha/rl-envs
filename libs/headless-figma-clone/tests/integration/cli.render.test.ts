import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pkgRoot = join(fileURLToPath(import.meta.url), '..', '..', '..');
const cliPath = join(pkgRoot, 'dist', 'cli.js');
const fixture = join(pkgRoot, 'tests', 'fixtures', 'phase2-compile-harness.hfc.json');

describe('hfc render CLI', () => {
  it('writes a non-empty PNG for a known node', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hfc-render-cli-'));
    const out = join(dir, 'frame.png');
    try {
      const result = spawnSync(
        process.execPath,
        [cliPath, 'render', '--file', fixture, '--node', 'I3', '--out', out],
        { encoding: 'utf8', cwd: pkgRoot, timeout: 60_000 }
      );
      expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
      const st = statSync(out);
      expect(st.size).toBeGreaterThan(100);
      const header = readFileSync(out).subarray(0, 8);
      expect(header[0]).toBe(0x89);
      expect(header[1]).toBe(0x50);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits promptly after rendering (Playwright browser is closed)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hfc-render-exit-'));
    const out = join(dir, 'frame.png');
    const started = Date.now();
    try {
      const result = spawnSync(
        process.execPath,
        [cliPath, 'render', '--file', fixture, '--node', 'I3', '--out', out],
        { encoding: 'utf8', cwd: pkgRoot, timeout: 60_000 }
      );
      expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
      expect(Date.now() - started).toBeLessThan(45_000);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
