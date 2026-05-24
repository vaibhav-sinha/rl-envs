import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-id-res-'));
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

describe('useFigmaScript node id reservation', () => {
  it('createInstance + createAutoLayout + appendChild does not collide reserved ids', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'IdRes' });

      const run = await runUseFigmaScript(
        `
const shell = figma.createFrame();
shell.name = 'Screen';
shell.resize(390, 844);

const headerFrame = figma.createFrame();
headerFrame.name = 'HeaderSource';
headerFrame.resize(390, 56);
const headerTitle = figma.createText();
headerTitle.characters = 'Header';
headerTitle.fontSize = 16;
headerFrame.appendChild(headerTitle);
figma.currentPage.appendChild(headerFrame);
const comp = figma.createComponentFromNode(headerFrame);

const header = figma.createInstance(comp);
const content = figma.createAutoLayout('VERTICAL', { name: 'Content' });
const t = figma.createText();
t.characters = 'x';
t.fontSize = 14;
content.appendChild(t);
shell.appendChild(header);
shell.appendChild(content);
figma.currentPage.appendChild(shell);
return { ok: true, headerId: header.id, contentId: content.id };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      expect(run.result).toEqual(expect.objectContaining({ ok: true }));
      expect(run.message ?? '').not.toMatch(/already exists with type/i);
    });
  });

  it('multiple createInstance + nested auto-layout nodes avoid id collisions', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'IdResMulti' });

      const run = await runUseFigmaScript(
        `
const screen = figma.createFrame();
screen.name = 'Screen';
screen.resize(390, 844);

function makeComp(name) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(100, 40);
  const t = figma.createText();
  t.characters = name;
  t.fontSize = 12;
  f.appendChild(t);
  figma.currentPage.appendChild(f);
  return figma.createComponentFromNode(f);
}

const compA = makeComp('A');
const compB = makeComp('B');

const header = figma.createInstance(compA);
const footer = figma.createInstance(compB);
const body = figma.createAutoLayout('VERTICAL', { name: 'Body' });
const row = figma.createAutoLayout('HORIZONTAL', { name: 'Row' });
const label = figma.createText();
label.characters = 'Row';
label.fontSize = 14;
row.appendChild(label);
body.appendChild(row);
screen.appendChild(header);
screen.appendChild(body);
screen.appendChild(footer);
figma.currentPage.appendChild(screen);
return { ok: true, ids: [header.id, body.id, footer.id, row.id] };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { ok: boolean; ids: string[] };
      expect(r.ok).toBe(true);
      expect(new Set(r.ids).size).toBe(r.ids.length);
      expect(run.message ?? '').not.toMatch(/already exists with type/i);
    });
  });
});
