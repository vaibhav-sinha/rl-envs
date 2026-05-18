import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

function findInstanceByName(
  envelope: ReturnType<typeof importFigmaPluginSnapshot>['envelope'],
  pageName: string,
  instanceName: string
) {
  const page = envelope.document.children.find((p) => p.name === pageName);
  if (!page) return undefined;
  const stack = [...page.children];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.type === 'INSTANCE' && n.name === instanceName) return n;
    if ('children' in n && Array.isArray(n.children)) stack.push(...(n.children as typeof stack));
  }
  return undefined;
}

describe('INSTANCE mainComponent import', () => {
  const snapshot = parseFigmaPluginSnapshot(
    JSON.parse(readFileSync(join(fixturesDir, 'instance-main-component.snapshot.json'), 'utf8'))
  );
  const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Instance Main' });

  it('maps explicit mainComponentId to the Asset page COMPONENT', () => {
    const inst = findInstanceByName(envelope, 'Visual', 'Image');
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type !== 'INSTANCE') return;

    expect(inst.mainComponentId).not.toBe('I0');
    const findComponent = (componentId: string) => {
      const stack = envelope.document.children.flatMap((p) => p.children);
      while (stack.length) {
        const n = stack.pop()!;
        if (n.type === 'COMPONENT' && n.id === componentId) return n;
        if ('children' in n && Array.isArray(n.children)) stack.push(...n.children);
      }
      return undefined;
    };
    const comp = findComponent(inst.mainComponentId);
    expect(comp?.name).toBe('Property 1=Coffee, Property 2=6');
  });

  it('resolves mainComponent from variant properties when mainComponentId is absent', () => {
    const inst = findInstanceByName(envelope, 'Visual', 'Image By Variant Name');
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type !== 'INSTANCE') return;

    expect(inst.mainComponentId).not.toBe('I0');
    expect(inst.mainComponentId).toBe(
      findInstanceByName(envelope, 'Visual', 'Image')?.mainComponentId
    );
  });

  it('scales component master geometry to instance bounds', () => {
    const inst = findInstanceByName(envelope, 'Visual', 'Scaled Hero');
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type !== 'INSTANCE') return;

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: inst.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(out.html).toContain('width:200px;height:150px');
    expect(out.html).not.toContain('width:100px;height:80px');
  });

  it('compiles instances via component masters without missing_component warnings', () => {
    const visualPage = envelope.document.children.find((p) => p.name === 'Visual')!;
    const out = designCompiler.compileFirstPage({
      envelope,
      pageId: visualPage.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(out.warnings.some((w) => w.startsWith('missing_component:'))).toBe(false);
    expect(out.html).toContain('hfc-component-instance');
    expect(out.html).not.toContain('hfc-instance-detached');
  });
});
