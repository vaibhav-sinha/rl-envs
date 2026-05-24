import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('prepare-task-design.mjs', () => {
  it('materializes design files and removes shared designs dir', () => {
    const root = mkdtempSync(join(tmpdir(), 'prepare-design-'));
    const designsRoot = join(root, 'designs');
    const designDir = join(designsRoot, 'sample-design');
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, 'design.hfc.json'),
      JSON.stringify({
        schemaVersion: 1,
        document: {
          id: 'I0',
          type: 'DOCUMENT',
          children: [
            {
              id: 'I1',
              type: 'PAGE',
              sourceFigmaId: '0:1',
              children: [
                { id: 'I2', type: 'FRAME', sourceFigmaId: '1:1', children: [] },
                { id: 'I3', type: 'FRAME', sourceFigmaId: '1:2', children: [] },
              ],
            },
          ],
        },
      }) + '\n',
      'utf8'
    );
    mkdirSync(join(designDir, 'design.hfc.assets'), { recursive: true });
    writeFileSync(join(designDir, 'design.hfc.assets', 'abc.png'), 'png', 'utf8');

    const specPath = join(root, 'design-spec.json');
    writeFileSync(
      specPath,
      JSON.stringify({ schema_version: 1, base: 'sample-design', node_exclusions: ['1:2'] }) + '\n',
      'utf8'
    );

    const workspace = join(root, 'workspace');
    const baseline = join(root, 'baseline', 'design.initial.hfc.json');
    const script = join(process.cwd(), '../../envs/figma-design/scripts/prepare-task-design.mjs');

    const result = spawnSync(
      'node',
      [
        script,
        '--spec',
        specPath,
        '--designs-root',
        designsRoot,
        '--workspace',
        workspace,
        '--baseline',
        baseline,
      ],
      { encoding: 'utf8' }
    );
    expect(result.status).toBe(0);

    const workspaceDesign = JSON.parse(readFileSync(join(workspace, 'design.hfc.json'), 'utf8')) as {
      document: { children: Array<{ children: Array<{ sourceFigmaId?: string }> }> };
    };
    const pageChildren = workspaceDesign.document.children[0]!.children;
    expect(pageChildren.some((n) => n.sourceFigmaId === '1:2')).toBe(false);
    expect(existsSync(join(workspace, 'design.hfc.assets', 'abc.png'))).toBe(true);
    expect(readFileSync(baseline, 'utf8')).toBe(readFileSync(join(workspace, 'design.hfc.json'), 'utf8'));
    expect(existsSync(designsRoot)).toBe(false);

    rmSync(root, { recursive: true, force: true });
  });
});
