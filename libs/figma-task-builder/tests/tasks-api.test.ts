import { mkdtempSync, rmSync } from 'node:fs';
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
});
