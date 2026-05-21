import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appendCommandIssue,
  appendDetachedNodes,
  issuesPathForHfcFile,
} from '../../src/persistence/issuesFile.js';

describe('issuesFile', () => {
  it('appendDetachedNodes accumulates across calls', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-issues-'));
    const designPath = join(base, 'design.hfc.json');
    const issuesPath = issuesPathForHfcFile(designPath);

    await appendDetachedNodes(designPath, [{ type: 'FRAME', name: 'A' }]);
    await appendDetachedNodes(designPath, [{ type: 'TEXT', name: 'B', characters: 'hi' }]);

    const parsed = JSON.parse(readFileSync(issuesPath, 'utf8')) as {
      schema_version: number;
      detached: unknown[];
      commands: unknown[];
    };
    expect(parsed.schema_version).toBe(1);
    expect(parsed.detached).toHaveLength(2);
    expect(parsed.detached[0]).toMatchObject({ type: 'FRAME', name: 'A' });
    expect(parsed.detached[1]).toMatchObject({ type: 'TEXT', name: 'B' });
    expect(parsed.commands).toEqual([]);

    rmSync(base, { recursive: true, force: true });
  });

  it('appendCommandIssue accumulates and preserves detached', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-issues-cmd-'));
    const designPath = join(base, 'design.hfc.json');
    const issuesPath = issuesPathForHfcFile(designPath);

    await appendDetachedNodes(designPath, [{ type: 'FRAME', name: 'Orphan' }]);
    await appendCommandIssue(designPath, { success: true });
    await appendCommandIssue(designPath, {
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'boom',
    });

    const parsed = JSON.parse(readFileSync(issuesPath, 'utf8')) as {
      detached: unknown[];
      commands: Array<{ success: boolean; errorCode?: string; message?: string; at: string }>;
    };
    expect(parsed.detached).toHaveLength(1);
    expect(parsed.commands).toHaveLength(2);
    expect(parsed.commands[0].success).toBe(true);
    expect(parsed.commands[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.commands[1]).toMatchObject({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'boom',
    });

    rmSync(base, { recursive: true, force: true });
  });

  it('appendCommandIssue truncates long error messages', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-issues-trunc-'));
    const designPath = join(base, 'design.hfc.json');
    const issuesPath = issuesPathForHfcFile(designPath);

    const longMsg = 'x'.repeat(600);
    await appendCommandIssue(designPath, {
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: longMsg,
    });

    const parsed = JSON.parse(readFileSync(issuesPath, 'utf8')) as {
      commands: Array<{ message?: string }>;
    };
    expect(parsed.commands[0].message).toHaveLength(501);
    expect(parsed.commands[0].message?.endsWith('…')).toBe(true);

    rmSync(base, { recursive: true, force: true });
  });
});
