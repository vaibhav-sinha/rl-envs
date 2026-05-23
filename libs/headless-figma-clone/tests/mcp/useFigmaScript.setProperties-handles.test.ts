import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-setprops-'));
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

describe('setProperties handle stability', () => {
  it('getStyledTextSegments remains available after setProperties on nested instance text', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Handles' });

      const setup = await runUseFigmaScript(
        `
const shell = figma.createFrame();
shell.resize(120, 48);
const label = figma.createText();
label.characters = 'Resend code in 1:00';
label.fontSize = 14;
shell.appendChild(label);
figma.currentPage.appendChild(shell);
const comp = figma.createComponentFromNode(shell);
comp.componentPropertyDefinitions = {
  'Text#1:0': { type: 'TEXT', defaultValue: 'Resend code in 1:00' },
};
const inst = figma.createInstance(comp);
figma.currentPage.appendChild(inst);
const textId = inst.findAll(n => n.type === 'TEXT')[0].id;
return { instId: inst.id, textId };
`.trim(),
        engine
      );
      expect(setup.kind).toBe('ok');
      if (setup.kind !== 'ok') return;
      const { instId, textId } = setup.result as { instId: string; textId: string };

      const after = await runUseFigmaScript(
        `
const resendBtn = figma.getNodeById('${instId}');
const textNode = figma.getNodeById('${textId}');
resendBtn.setProperties({
  Text: 'Max attempts message',
});
const segments = textNode.getStyledTextSegments(['fontName']);
return {
  segLen: segments.length,
  textId: textNode.id,
  chars: textNode.characters,
};
`.trim(),
        engine
      );

      expect(after.kind).toBe('ok');
      if (after.kind !== 'ok') return;
      const r = after.result as { segLen: number; textId: string; chars: string };
      expect(r.textId).toBe(textId);
      expect(r.segLen).toBeGreaterThan(0);
      expect(r.chars).toContain('Max attempts');
    });
  });
});
