import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createTaskBuilderServer } from '../src/server.js';
import { TasksStore } from '../src/tasks-store.js';

describe('Task Builder API', () => {
  let baseDir: string;
  let port: number;
  let close: () => void;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'tb-test-'));
    process.env.TB_TASKS_DIR = join(baseDir, 'drafts');
    process.env.TB_HARBOR_TASKS_DIR = join(baseDir, 'harbor');
    process.env.TB_HTTP_PORT = '0';

    const config = loadConfig();
    const store = new TasksStore(config);
    const started = await createTaskBuilderServer(config, store);
    port = started.port;
    close = () => started.server.close();
  });

  afterAll(() => {
    close();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('creates and lists a draft task', async () => {
    const create = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test-task' }),
    });
    expect(create.status).toBe(201);

    const list = await fetch(`http://127.0.0.1:${port}/tasks`);
    const body = (await list.json()) as { tasks: Array<{ id: string; status: string }> };
    expect(body.tasks.some((t) => t.id === 'test-task' && t.status === 'draft')).toBe(true);
  });

  it('rejects duplicate task ids', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test-task' }),
    });
    expect(res.status).toBe(409);
  });

  it('copies design export from another task with optional exclusions', async () => {
    const draftsDir = process.env.TB_TASKS_DIR!;

    for (const id of ['source-task', 'target-task']) {
      const res = await fetch(`http://127.0.0.1:${port}/tasks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: id }),
      });
      expect(res.status).toBe(201);
    }

    const envelope = {
      schemaVersion: 1,
      fileKey: 'fk',
      fileName: 'Source',
      nextInternalId: 3,
      document: {
        id: 'I0',
        type: 'DOCUMENT',
        name: 'Doc',
        sourceFigmaId: '0:0',
        children: [
          {
            id: 'I1',
            type: 'PAGE',
            name: 'Page',
            sourceFigmaId: '0:1',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            children: [
              { id: 'I2', type: 'FRAME', name: 'Keep', sourceFigmaId: '1:1', x: 0, y: 0, width: 10, height: 10, children: [] },
              { id: 'I3', type: 'FRAME', name: 'Drop', sourceFigmaId: '1:2', x: 0, y: 0, width: 10, height: 10, children: [] },
            ],
          },
        ],
      },
    };

    const sourceEnv = join(draftsDir, 'source-task', 'environment');
    mkdirSync(sourceEnv, { recursive: true });
    writeFileSync(join(sourceEnv, 'design.hfc.json'), JSON.stringify(envelope, null, 2) + '\n', 'utf8');
    mkdirSync(join(sourceEnv, 'design.hfc.assets'), { recursive: true });
    writeFileSync(join(sourceEnv, 'design.hfc.assets', 'abc.png'), Buffer.from('png'), 'utf8');

    const copyRes = await fetch(`http://127.0.0.1:${port}/tasks/target-task/export`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'copy',
        copyFromTaskId: 'source-task',
        excludeFigmaNodeIds: ['1:2'],
      }),
    });
    expect(copyRes.status).toBe(200);
    const copyBody = (await copyRes.json()) as { exclusions_applied: boolean };
    expect(copyBody.exclusions_applied).toBe(true);

    const copied = JSON.parse(
      readFileSync(join(draftsDir, 'target-task', 'environment', 'design.hfc.json'), 'utf8')
    ) as typeof envelope;
    const pageChildren = copied.document.children[0]!.children;
    expect(pageChildren.some((n) => n.sourceFigmaId === '1:2')).toBe(false);
    expect(pageChildren.some((n) => n.sourceFigmaId === '1:1')).toBe(true);
    expect(readFileSync(join(draftsDir, 'target-task', 'tests', 'eval-spec.json'), 'utf8')).toContain(
      'schema_version'
    );
  });
});
