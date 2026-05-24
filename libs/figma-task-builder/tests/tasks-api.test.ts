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
    process.env.TB_DESIGNS_DIR = join(baseDir, 'designs');
    process.env.TB_HTTP_PORT = '0';
    process.env.TB_SKIP_HARBOR_ADD = '1';

    const designsDir = process.env.TB_DESIGNS_DIR;
    mkdirSync(join(designsDir!, 'shared-design'), { recursive: true });
    writeFileSync(
      join(designsDir!, 'shared-design', 'design.hfc.json'),
      JSON.stringify({ schemaVersion: 1, document: { id: 'I0', type: 'DOCUMENT', children: [] } }) + '\n',
      'utf8'
    );

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

  it('completes an edit flow when the harbor task already exists', async () => {
    const draftsDir = process.env.TB_TASKS_DIR!;
    const harborDir = process.env.TB_HARBOR_TASKS_DIR!;
    const taskId = 'edit-existing-harbor';

    const create = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: taskId }),
    });
    expect(create.status).toBe(201);

    const envDir = join(draftsDir, taskId, 'environment');
    mkdirSync(envDir, { recursive: true });
    writeFileSync(
      join(envDir, 'design-spec.json'),
      JSON.stringify({ schema_version: 1, base: 'shared-design' }, null, 2) + '\n',
      'utf8'
    );

    const firstComplete = await fetch(`http://127.0.0.1:${port}/tasks/${taskId}/complete`, {
      method: 'POST',
    });
    expect(firstComplete.status).toBe(200);
    expect(readFileSync(join(harborDir, taskId, 'task.toml'), 'utf8')).toContain(taskId);

    const del = await fetch(`http://127.0.0.1:${port}/tasks/${taskId}`, { method: 'DELETE' });
    expect(del.status).toBe(200);

    const reopen = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: taskId, copyFrom: taskId }),
    });
    expect(reopen.status).toBe(201);

    writeFileSync(join(draftsDir, taskId, 'instruction.md'), '# Updated instruction\n', 'utf8');

    const secondComplete = await fetch(`http://127.0.0.1:${port}/tasks/${taskId}/complete`, {
      method: 'POST',
    });
    expect(secondComplete.status).toBe(200);
    expect(readFileSync(join(harborDir, taskId, 'instruction.md'), 'utf8')).toBe('# Updated instruction\n');
  });

  it('reopens an existing draft when loading a harbor task for edit again', async () => {
    const draftsDir = process.env.TB_TASKS_DIR!;
    const taskId = 'reopen-existing-draft';
    const marker = '# Reopen marker\n';

    const create = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: taskId }),
    });
    expect(create.status).toBe(201);

    const envDir = join(draftsDir, taskId, 'environment');
    mkdirSync(envDir, { recursive: true });
    writeFileSync(
      join(envDir, 'design-spec.json'),
      JSON.stringify({ schema_version: 1, base: 'shared-design' }, null, 2) + '\n',
      'utf8'
    );

    const complete = await fetch(`http://127.0.0.1:${port}/tasks/${taskId}/complete`, {
      method: 'POST',
    });
    expect(complete.status).toBe(200);

    writeFileSync(join(draftsDir, taskId, 'instruction.md'), marker, 'utf8');

    const reopen = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: taskId, copyFrom: taskId }),
    });
    expect(reopen.status).toBe(201);

    const loadHarbor = await fetch(`http://127.0.0.1:${port}/tasks/${taskId}/load-harbor`, {
      method: 'POST',
    });
    expect(loadHarbor.status).toBe(200);

    expect(readFileSync(join(draftsDir, taskId, 'instruction.md'), 'utf8')).toBe(marker);
  });

  it('saves design-spec for a task with optional exclusions metadata', async () => {
    const draftsDir = process.env.TB_TASKS_DIR!;

    const create = await fetch(`http://127.0.0.1:${port}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'design-spec-task' }),
    });
    expect(create.status).toBe(201);

    const save = await fetch(`http://127.0.0.1:${port}/tasks/design-spec-task/design-spec`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ base: 'shared-design', node_exclusions: ['1:2'] }),
    });
    expect(save.status).toBe(200);

    const spec = JSON.parse(
      readFileSync(join(draftsDir, 'design-spec-task', 'environment', 'design-spec.json'), 'utf8')
    ) as { base: string; node_exclusions: string[] };
    expect(spec.base).toBe('shared-design');
    expect(spec.node_exclusions).toEqual(['1:2']);
  });
});
