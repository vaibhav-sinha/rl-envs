import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

/** Read-only task fixture; never load or save this path directly. */
const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

type ScriptTimingMark = {
  phase: string;
  deltaMs: number;
  sinceStartMs: number;
  [key: string]: unknown;
};

/** Injected into figma scripts — accumulates phase marks (return as timingMarks). */
const SCRIPT_TIMING_HELPER = `
const __t0 = Date.now();
let __tPrev = __t0;
const __timingMarks = [];
function __mark(phase, extra) {
  const now = Date.now();
  __timingMarks.push({
    phase,
    deltaMs: now - __tPrev,
    sinceStartMs: now - __t0,
    ...(extra || {}),
  });
  __tPrev = now;
}
`.trim();

function logTimingLine(line: Record<string, unknown>): void {
  process.stderr.write(`${JSON.stringify({ kind: 'detach_attach_timing', ...line })}\n`);
}

function printScriptTimingReport(label: string, marks: ScriptTimingMark[] | undefined): void {
  if (!marks?.length) {
    logTimingLine({ scope: 'script_report', label, note: 'no timingMarks in script result' });
    return;
  }
  logTimingLine({ scope: 'script_report', label, phase: 'summary:start', markCount: marks.length });
  let maxDelta = 0;
  let maxPhase = '';
  for (const m of marks) {
    logTimingLine({ scope: 'script_report', label, ...m });
    if (m.deltaMs > maxDelta) {
      maxDelta = m.deltaMs;
      maxPhase = m.phase;
    }
  }
  logTimingLine({
    scope: 'script_report',
    label,
    phase: 'summary:end',
    slowestPhase: maxPhase,
    slowestDeltaMs: maxDelta,
    scriptWallMs: marks[marks.length - 1]?.sinceStartMs,
  });
}

/** Copies the fixture into a temp workspace; applyTransaction writes only there. */
function withDesignFixture<T>(fn: (designPath: string) => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-detach-'));
  const ws = join(base, 'ws');
  const designPath = join(ws, 'design.hfc.json');
  const prev = process.env.HFC_WORKSPACE_DIR;
  return (async () => {
    try {
      mkdirSync(ws, { recursive: true });
      copyFileSync(designFixturePath, designPath);
      const assetsFixture = join(dirname(designFixturePath), 'design.hfc.assets');
      const assetsDest = join(dirname(designPath), 'design.hfc.assets');
      if (existsSync(assetsFixture)) {
        cpSync(assetsFixture, assetsDest, { recursive: true });
      }
      process.env.HFC_WORKSPACE_DIR = ws;
      return await fn(designPath);
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  logTimingLine({ scope: 'test_harness', phase: `${label}:start`, now: t0 });
  try {
    return await fn();
  } finally {
    logTimingLine({
      scope: 'test_harness',
      phase: `${label}:done`,
      totalMs: Math.round(performance.now() - t0),
      now: performance.now(),
    });
  }
}

describe('useFigmaScript detached frame attach (Figma parity)', () => {
  it('step 14 pattern: clone into detached frame then append to section commits', async () => {
    await withDesignFixture(async (designPath) => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });

      await timed('loadFromDisk', () => engine.loadFromDisk({ absolutePath: designPath, save: false }));

      const sourceId = engine.resolveSourceFigmaId('2176:169413');
      const sectionId = engine.resolveSourceFigmaId('1621:130309');
      expect(sourceId).toBeTruthy();
      expect(sectionId).toBeTruthy();

      const run = await timed('step14_runUseFigmaScript', () =>
        runUseFigmaScript(
          `
${SCRIPT_TIMING_HELPER}

__mark('script_start');
const targetPage = figma.root.children.find((p) => p.name === "Final design");
await figma.setCurrentPageAsync(targetPage);
__mark('setCurrentPageAsync');

const source = await figma.getNodeByIdAsync('${sourceId}');
__mark('getNodeByIdAsync:source', { sourceName: source?.name, sourceType: source?.type });
const section = await figma.getNodeByIdAsync('${sectionId}');
__mark('getNodeByIdAsync:section');

const newFrame = figma.createFrame();
__mark('createFrame');
newFrame.name = 'Onboarding/OTP/MaxAttempts';
newFrame.resize(source.width, source.height);
newFrame.x = 1313.25;
newFrame.y = 1533;
newFrame.fills = source.fills ? JSON.parse(JSON.stringify(source.fills)) : [];
__mark('newFrame_setup');

const childNames = source.children.map((c) => c.name);
__mark('source.children_read', { childCount: childNames.length, childNames });

let childIndex = 0;
for (const child of source.children) {
  __mark('loop_iter_start', { childIndex, childName: child.name, childType: child.type });
  const c = child.clone();
  __mark('child.clone', { childIndex, childName: child.name });
  newFrame.appendChild(c);
  __mark('newFrame.appendChild', { childIndex, childName: child.name, cloneId: c.id });
  childIndex += 1;
}

section.appendChild(newFrame);
__mark('section.appendChild(newFrame)', { childCount: newFrame.children.length });

return {
  createdNodeIds: [newFrame.id],
  childCount: newFrame.children.length,
  timingMarks: __timingMarks,
};
`.trim(),
          engine
        )
      );

      expect(run.kind).toBe('ok');
      if (run.kind === 'ok') {
        printScriptTimingReport(
          'step14',
          (run.result as { timingMarks?: ScriptTimingMark[] }).timingMarks
        );
      }
      if (run.kind !== 'ok') return;

      const tx = await timed('step14_commit', () =>
        run.preApplied && run.committedWorking
          ? engine.commitEnvelope(run.committedWorking, {
              touchedNodeIds: run.touchedNodeIds,
            })
          : engine.applyTransaction(run.operations)
      );
      expect(tx.success).toBe(true);
      if (!tx.success) return;

      const frameId = (run.result as { createdNodeIds: string[] }).createdNodeIds[0];
      const fileAfterCommit = engine.getActiveFile()!;
      const section = fileAfterCommit.document.children
        .find((p) => p.type === 'PAGE' && p.name === 'Final design')
        ?.children.find((n) => n.id === sectionId);
      expect(section?.type).toBe('SECTION');
      const frame =
        section && 'children' in section
          ? section.children?.find((c: { id: string }) => c.id === frameId)
          : undefined;
      expect(frame?.name).toBe('Onboarding/OTP/MaxAttempts');
      expect(frame && 'children' in frame ? (frame.children?.length ?? 0) : 0).toBe(4);
    });
  }, 300_000);

  it('step 15+16: clone into attached dest commits via duplicateNode replay', async () => {
    await withDesignFixture(async (designPath) => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });

      await timed('loadFromDisk', () => engine.loadFromDisk({ absolutePath: designPath, save: false }));

      const sourceId = engine.resolveSourceFigmaId('2176:169413');
      const sectionId = engine.resolveSourceFigmaId('1621:130309');
      expect(sourceId).toBeTruthy();
      expect(sectionId).toBeTruthy();

      const step15 = await timed('step15_runUseFigmaScript', () =>
        runUseFigmaScript(
          `
${SCRIPT_TIMING_HELPER}

__mark('step15_script_start');
const targetPage = figma.root.children.find((p) => p.name === "Final design");
await figma.setCurrentPageAsync(targetPage);
__mark('step15_setCurrentPageAsync');
const section = await figma.getNodeByIdAsync('${sectionId}');
__mark('step15_getNodeByIdAsync:section');
const newFrame = figma.createFrame();
__mark('step15_createFrame');
newFrame.name = 'Onboarding/OTP/MaxAttempts';
newFrame.resize(360, 800);
section.appendChild(newFrame);
__mark('step15_section.appendChild');
return { frameId: newFrame.id, timingMarks: __timingMarks };
`.trim(),
          engine
        )
      );

      expect(step15.kind).toBe('ok');
      if (step15.kind === 'ok') {
        printScriptTimingReport(
          'step15',
          (step15.result as { timingMarks?: ScriptTimingMark[] }).timingMarks
        );
      }
      if (step15.kind !== 'ok') return;

      const tx15 = await timed('step15_commit', () =>
        step15.preApplied && step15.committedWorking
          ? engine.commitEnvelope(step15.committedWorking, {
              touchedNodeIds: step15.touchedNodeIds,
            })
          : engine.applyTransaction(step15.operations)
      );
      expect(tx15.success).toBe(true);

      const fileAfter15 = engine.getActiveFile()!;
      const sectionAfter15 = fileAfter15.document.children
        .find((p) => p.type === 'PAGE' && p.name === 'Final design')
        ?.children.find((n) => n.id === sectionId);
      const frameId = (step15.result as { frameId?: string }).frameId
        ?? (sectionAfter15 && 'children' in sectionAfter15
          ? sectionAfter15.children?.find((c: { name: string }) => c.name === 'Onboarding/OTP/MaxAttempts')?.id
          : undefined);
      expect(frameId).toBeTruthy();
      const destFrameId = frameId as string;

      const step16 = await timed('step16_runUseFigmaScript', () =>
        runUseFigmaScript(
          `
${SCRIPT_TIMING_HELPER}

__mark('step16_script_start');
const targetPage = figma.root.children.find((p) => p.name === "Final design");
await figma.setCurrentPageAsync(targetPage);
__mark('step16_setCurrentPageAsync');
const source = await figma.getNodeByIdAsync('${sourceId}');
__mark('step16_getNodeByIdAsync:source', { sourceName: source?.name });
const dest = await figma.getNodeByIdAsync('${destFrameId}');
__mark('step16_getNodeByIdAsync:dest', { destName: dest?.name });

const childNames = source.children.map((c) => c.name);
__mark('step16_source.children_read', { childCount: childNames.length, childNames });

const clonedIds = [];
let childIndex = 0;
for (const child of source.children) {
  __mark('step16_loop_iter_start', { childIndex, childName: child.name, childType: child.type });
  const c = child.clone();
  __mark('step16_child.clone', { childIndex, childName: child.name, cloneId: c.id });
  dest.appendChild(c);
  __mark('step16_dest.appendChild', { childIndex, childName: child.name, cloneId: c.id });
  clonedIds.push(c.id);
  childIndex += 1;
}

__mark('step16_loop_done', { destChildCount: dest.children.length });
return { clonedIds, destChildCount: dest.children.length, timingMarks: __timingMarks };
`.trim(),
          engine
        )
      );

      expect(step16.kind).toBe('ok');
      if (step16.kind === 'ok') {
        printScriptTimingReport(
          'step16',
          (step16.result as { timingMarks?: ScriptTimingMark[] }).timingMarks
        );
      }
      if (step16.kind !== 'ok') return;

      const tx16 = await timed('step16_commit', () =>
        step16.preApplied && step16.committedWorking
          ? engine.commitEnvelope(step16.committedWorking, {
              touchedNodeIds: step16.touchedNodeIds,
            })
          : engine.applyTransaction(step16.operations)
      );
      expect(tx16.success).toBe(true);
      if (!tx16.success) return;

      expect((step16.result as { destChildCount: number }).destChildCount).toBeGreaterThanOrEqual(4);
    });
  }, 300_000);
});
