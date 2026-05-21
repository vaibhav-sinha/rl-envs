import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { issuesPathForHfcFile } from '../../src/persistence/issuesFile.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript detached capture', () => {
  it('queues pending children on unattached frame via proxy appendChild', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Pending' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
const label = figma.createText();
shell.appendChild(label);
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.detachedNodes).toHaveLength(1);
    const root = run.detachedNodes[0] as { children?: unknown[] };
    expect(root.children).toHaveLength(1);
  });

  it('collects orphan frame and nested pending children', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Detached' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
shell.name = 'Shell';
shell.resize(200, 100);
const label = figma.createText();
label.characters = 'orphan';
shell.appendChild(label);
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.detachedNodes).toHaveLength(1);
    const root = run.detachedNodes[0] as { type: string; name: string; children?: unknown[] };
    expect(root.type).toBe('FRAME');
    expect(root.name).toBe('Shell');
    expect(root.children).toHaveLength(1);
    expect((root.children![0] as { type: string }).type).toBe('TEXT');
  });

  it('appendDetachedIssues writes issues.hfc.json via MCP path', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-det-'));
    process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    const { filePath } = await engine.createEmptyFile({ fileName: 'Issues' });

    const run = await runUseFigmaScript(
      `
figma.createFrame();
`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    await engine.appendDetachedIssues(run.detachedNodes);

    const issuesPath = issuesPathForHfcFile(filePath);
    const issues = JSON.parse(readFileSync(issuesPath, 'utf8')) as { detached: unknown[] };
    expect(issues.detached.length).toBe(1);

    rmSync(base, { recursive: true, force: true });
  });

  it('returns empty detachedNodes when all nodes are appended', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Attached' });

    const run = await runUseFigmaScript(
      `
const f = figma.createFrame();
figma.currentPage.appendChild(f);
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.detachedNodes).toEqual([]);
  });
});
