import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-text-h-'));
  const prev = process.env.HFC_WORKSPACE_DIR;
  process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
  return (async () => {
    try {
      return await fn();
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

describe('useFigmaScript TEXT height', () => {
  it('createText with HEIGHT auto-resize reports non-zero height', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'TextH' });

      const run = await runUseFigmaScript(
        `
const t = figma.createText();
t.fontSize = 16;
t.textAutoResize = 'HEIGHT';
t.textAlignHorizontal = 'CENTER';
const frame = figma.createFrame();
frame.layoutMode = 'VERTICAL';
frame.resize(328, 200);
frame.appendChild(t);
t.characters = 'You have reached your max attempts. Retry OTP generation after 15:00 minutes';
t.resize(328, t.height);
figma.currentPage.appendChild(frame);
return { height: t.height, width: t.width };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { height: number; width: number };
      expect(r.width).toBe(328);
      expect(r.height).toBeGreaterThan(0);
    });
  });
});
