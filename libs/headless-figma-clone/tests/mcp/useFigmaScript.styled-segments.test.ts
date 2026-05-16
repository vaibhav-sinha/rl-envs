import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { TextNode } from '../../src/model/types.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-seg-'));
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

function findText(env: { document?: { children?: unknown[] } }): TextNode | undefined {
  function walk(nodes: unknown[] | undefined): TextNode | undefined {
    for (const n of nodes ?? []) {
      const node = n as TextNode & { children?: unknown[] };
      if (node.type === 'TEXT') return node;
      const found = walk(node.children as unknown[] | undefined);
      if (found) return found;
    }
    return undefined;
  }
  return walk(env.document?.children as unknown[] | undefined);
}

describe('useFigmaScript styledSegments', () => {
  it('scenario 05: setRange* before appendChild persist and compile', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Seg05' });
      const code = readFileSync(
        join(process.cwd(), 'verification/scenarios/05-styled-text-segments/script.js'),
        'utf8'
      );
      const run = await runUseFigmaScript(code, engine);
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const textCreate = run.operations.find(
        (o) => o.op === 'createNode' && o.node.type === 'TEXT'
      );
      expect(textCreate?.op === 'createNode' && textCreate.node.styledSegments?.length).toBe(3);

      const applied = await engine.applyTransaction(run.operations);
      expect(applied.success).toBe(true);

      const text = findText(engine.getActiveFile()!);
      expect(text?.styledSegments).toHaveLength(3);
      expect(text?.styledSegments?.[0]?.style.fontSize).toBe(24);
      expect(text?.styledSegments?.[0]?.style.fills?.[0]).toMatchObject({
        type: 'SOLID',
        color: { r: 0.1, g: 0.1, b: 0.1 },
      });
      expect(text?.styledSegments?.[2]?.style.hyperlink).toEqual({
        type: 'URL',
        url: 'https://example.com',
      });

      const compiled = designCompiler.compileSubtree({
        envelope: engine.getActiveFile()!,
        rootNodeId: run.result?.rootId as string,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
      });
      expect(compiled.css).toMatch(/height:30px/);
      expect(compiled.css).toMatch(/line-height:30px/);
      expect(compiled.html).toContain('font-size:24px');
      expect(compiled.html).toContain('rgba(230,26,26');
      expect(compiled.html).toContain('href="https://example.com"');
      expect(compiled.html).not.toContain('text-decoration:underline');
      expect(compiled.css).toContain('#hfc-root a');
      expect(compiled.css).toContain('text-decoration:none');
    });
  });
});
