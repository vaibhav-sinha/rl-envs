import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { mapUseFigmaToEngineOperations } from '../../src/mcp/useFigmaMap.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler, HFC_UA_RESET_CSS } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readFixture(name: string): FileEnvelope {
  const p = join(__dirname, '../fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8')) as FileEnvelope;
}

function withTempWorkspace<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-compiler-'));
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

const UA = `${HFC_UA_RESET_CSS}\n`;

/** Golden HTML for `tests/fixtures/phase1-minimal.valid.json` subtree I3, padding 0, inline CSS. */
const PHASE1_MINIMAL_INLINE_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
${UA}#hfc-root{position:relative;width:120px;height:80px;isolation:isolate;}
.hfc-node-I3{position:absolute;left:0px;top:0px;width:120px;height:80px;box-sizing:border-box;background-color:rgba(51,102,230,1);border:2px solid rgba(0,0,0,1);}
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:120px;height:80px;">
      <div class="hfc-node-I3" data-hfc-id="I3" style="z-index:0"></div>
    </div>
  </body>
</html>`;

const PHASE1_MINIMAL_EXTERNAL_CSS =
  UA +
  '#hfc-root{position:relative;width:152px;height:112px;isolation:isolate;}\n' +
  '.hfc-node-I3{position:absolute;left:16px;top:16px;width:120px;height:80px;box-sizing:border-box;background-color:rgba(51,102,230,1);border:2px solid rgba(0,0,0,1);}';

const PHASE1_MINIMAL_EXTERNAL_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
/* css attached separately */
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:152px;height:112px;">
      <div class="hfc-node-I3" data-hfc-id="I3" style="z-index:0"></div>
    </div>
  </body>
</html>`;

/** Nested frames built via figma.createFrame + appendChild; ids I3 (parent) and I4 (child) on fresh file. */
const PLUGIN_SCRIPT_NESTED_FRAMES = `
const parent = figma.createFrame();
parent.name = 'Parent';
parent.resize(100, 80);
parent.x = 5;
parent.y = 6;
parent.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
parent.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }];
parent.strokeWeight = 3;
figma.currentPage.appendChild(parent);

const child = figma.createFrame();
child.name = 'Child';
child.resize(20, 30);
child.x = 7;
child.y = 8;
child.fills = [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 0 }, opacity: 0.5 }];
parent.appendChild(child);

return { ok: true };
`.trim();

const NESTED_FRAMES_INLINE_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
${UA}#hfc-root{position:relative;width:100px;height:80px;isolation:isolate;}
.hfc-node-I3{position:absolute;left:0px;top:0px;width:100px;height:80px;box-sizing:border-box;background-color:rgba(255,0,0,1);border:3px solid rgba(0,0,255,1);}
.hfc-node-I4{position:absolute;left:7px;top:8px;width:20px;height:30px;box-sizing:border-box;background-color:rgba(0,128,0,0.5);border:none;}
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:100px;height:80px;">
      <div class="hfc-node-I3" data-hfc-id="I3" style="z-index:0"><div class="hfc-node-I4" data-hfc-id="I4" style="z-index:1"></div></div>
    </div>
  </body>
</html>`;

describe('DesignCompiler Phase 1 — exact HTML/CSS', () => {
  it('compiles phase1-minimal.valid.json (inline CSS) to the golden document string', () => {
    const envelope = readFixture('phase1-minimal.valid.json');
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(compiled.html).toBe(PHASE1_MINIMAL_INLINE_HTML);
    expect(compiled.css).toBe('');
    expect(compiled.warnings).toEqual([]);
    expect(compiled.bounds).toEqual({ x: 10, y: 20, width: 120, height: 80 });
    expect(compiled.rootClip).toEqual({ x: 0, y: 0, width: 120, height: 80 });
    expect(compiled.viewportWidth).toBe(120);
    expect(compiled.viewportHeight).toBe(80);
  });

  it('compiles the same fixture with viewport padding and external CSS block', () => {
    const envelope = readFixture('phase1-minimal.valid.json');
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 16, includeCss: true, inlineCss: false },
    });
    expect(compiled.html).toBe(PHASE1_MINIMAL_EXTERNAL_HTML);
    expect(compiled.css).toBe(PHASE1_MINIMAL_EXTERNAL_CSS);
    expect(compiled.bounds).toEqual({ x: 10, y: 20, width: 120, height: 80 });
    expect(compiled.rootClip).toEqual({ x: 16, y: 16, width: 120, height: 80 });
    expect(compiled.viewportWidth).toBe(152);
    expect(compiled.viewportHeight).toBe(112);
  });

  it('compileFirstPage unions two top-level frames and assigns z-order by tree walk', () => {
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'fixture-two-roots',
      fileName: 'TwoRoots',
      nextInternalId: 5,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page 1',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            children: [
              {
                id: 'I3',
                type: 'FRAME',
                name: 'A',
                x: 0,
                y: 0,
                width: 40,
                height: 30,
                children: [],
                fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
              },
              {
                id: 'I4',
                type: 'FRAME',
                name: 'B',
                x: 50,
                y: 10,
                width: 30,
                height: 20,
                children: [],
                fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }],
              },
            ],
          },
        ],
      },
    };
    const compiled = designCompiler.compileFirstPage({
      envelope,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const expected = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
${UA}#hfc-root{position:relative;width:80px;height:30px;isolation:isolate;}
.hfc-node-I3{position:absolute;left:0px;top:0px;width:40px;height:30px;box-sizing:border-box;background-color:rgba(255,0,0,1);border:none;}
.hfc-node-I4{position:absolute;left:50px;top:10px;width:30px;height:20px;box-sizing:border-box;background-color:rgba(0,0,255,1);border:none;}
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:80px;height:30px;">
      <div class="hfc-node-I3" data-hfc-id="I3" style="z-index:0"></div><div class="hfc-node-I4" data-hfc-id="I4" style="z-index:1"></div>
    </div>
  </body>
</html>`;
    expect(compiled.html).toBe(expected);
    expect(compiled.bounds).toEqual({ x: 0, y: 0, width: 80, height: 30 });
    expect(compiled.rootClip).toEqual({ x: 0, y: 0, width: 80, height: 30 });
  });

  it('treats invisible first fill as transparent and strokeWeight 0 as no border', () => {
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'k',
      fileName: 'Edges',
      nextInternalId: 4,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page 1',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            children: [
              {
                id: 'I3',
                type: 'FRAME',
                name: 'F',
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                children: [],
                fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: false }],
                strokes: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 } }],
                strokeWeight: 0,
              },
            ],
          },
        ],
      },
    };
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const expected = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
${UA}#hfc-root{position:relative;width:10px;height:10px;isolation:isolate;}
.hfc-node-I3{position:absolute;left:0px;top:0px;width:10px;height:10px;box-sizing:border-box;background-color:transparent;border:none;}
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:10px;height:10px;">
      <div class="hfc-node-I3" data-hfc-id="I3" style="z-index:0"></div>
    </div>
  </body>
</html>`;
    expect(compiled.html).toBe(expected);
  });

  it('throws when compileSubtree root is not a known FRAME id', () => {
    const envelope = readFixture('phase1-minimal.valid.json');
      expect(() =>
      designCompiler.compileSubtree({
        envelope,
        rootNodeId: 'I999',
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      })
    ).toThrow('compileSubtree: unknown node id I999');
  });

  it('compileFirstPage on an empty page produces a minimal canvas', () => {
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'k',
      fileName: 'Empty',
      nextInternalId: 3,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page 1',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            backgrounds: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.6 } }],
            children: [],
          },
        ],
      },
    };
    const compiled = designCompiler.compileFirstPage({
      envelope,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(compiled.html).toContain('#hfc-root');
    expect(compiled.html).toMatch(/background-color:rgba\(51,\s*102,\s*153/);
  });

  it('compileSubtree accepts a PAGE id like compileFirstPage', () => {
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileKey: 'k',
      fileName: 'PageRoot',
      nextInternalId: 4,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page 1',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            children: [
              {
                id: 'I3',
                type: 'FRAME',
                name: 'Only',
                x: 0,
                y: 0,
                width: 50,
                height: 40,
                fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
                children: [],
              },
            ],
          },
        ],
      },
    };
    const byPage = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I2',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const byFrame = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(byPage.html).toContain('hfc-node-I3');
    expect(byFrame.html).toContain('hfc-node-I3');
  });
});

describe('use_figma script → engine → compiler (deterministic)', () => {
  it('matches golden HTML for nested frames created with figma plugin API code', async () => {
    await withTempWorkspace(async () => {
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      await engine.createEmptyFile({ fileName: 'ScriptNest' });
      const run = await runUseFigmaScript(PLUGIN_SCRIPT_NESTED_FRAMES, engine);
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const first = run.operations[0];
      if (first?.op === 'createNode' && first.node.type === 'FRAME') {
        expect('children' in first.node ? first.node.children : undefined).toBeUndefined();
      }
      const applied = await engine.applyTransaction(run.operations);
      expect(applied.success).toBe(true);
      const compiled = designCompiler.compileSubtree({
        envelope: engine.getActiveFile()!,
        rootNodeId: 'I3',
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(compiled.html).toBe(NESTED_FRAMES_INLINE_HTML);
      expect(compiled.warnings).toEqual([]);
      expect(compiled.bounds).toEqual({ x: 5, y: 6, width: 100, height: 80 });
    });
  });
});

describe('use_figma JSON operations → compiler', () => {
  it('mapUseFigmaToEngineOperations + transaction yields the same subtree as the minimal fixture', async () => {
    await withTempWorkspace(async () => {
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      await engine.createEmptyFile({ fileName: 'Ops' });
      const ops = mapUseFigmaToEngineOperations([
        {
          operation: 'createNode',
          parentId: 'I2',
          node: {
            type: 'FRAME',
            name: 'Hero',
            x: 10,
            y: 20,
            width: 120,
            height: 80,
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9 } }],
            strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
            strokeWeight: 2,
          },
        },
      ]);
      const r = await engine.applyTransaction(ops);
      expect(r.success).toBe(true);
      const compiled = designCompiler.compileSubtree({
        envelope: engine.getActiveFile()!,
        rootNodeId: 'I3',
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(compiled.html).toBe(PHASE1_MINIMAL_INLINE_HTML);
    });
  });

  it('updateNode patches geometry and paints then compile to expected CSS', async () => {
    await withTempWorkspace(async () => {
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      await engine.createEmptyFile({ fileName: 'Patch' });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: { type: 'FRAME', name: 'X', x: 0, y: 0, width: 1, height: 1, children: [] },
        },
      ]);
      await engine.applyTransaction([
        {
          op: 'updateNode',
          nodeId: 'I3',
          patch: {
            x: 2,
            y: 3,
            width: 11,
            height: 13,
            fills: [{ type: 'SOLID', color: { r: 0.333333, g: 0, b: 0 } }],
            strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0.501961 } }],
            strokeWeight: 1,
          },
        },
      ]);
      const compiled = designCompiler.compileSubtree({
        envelope: engine.getActiveFile()!,
        rootNodeId: 'I3',
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      const expected = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
${UA}#hfc-root{position:relative;width:11px;height:13px;isolation:isolate;}
.hfc-node-I3{position:absolute;left:0px;top:0px;width:11px;height:13px;box-sizing:border-box;background-color:rgba(85,0,0,1);border:1px solid rgba(0,0,128,1);}
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:11px;height:13px;">
      <div class="hfc-node-I3" data-hfc-id="I3" style="z-index:0"></div>
    </div>
  </body>
</html>`;
      expect(compiled.html).toBe(expected);
    });
  });
});
