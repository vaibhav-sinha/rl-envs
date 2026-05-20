import { describe, expect, it } from 'vitest';
import { emptyIconAnalysis } from '../plugin/src/tools/incrementalIconWalk.js';
import { IconExportRegistry } from '../plugin/src/tools/iconExportRegistry.js';

const svgBytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

function instanceWire(id: string, mainComponentId: string) {
  return {
    id,
    type: 'INSTANCE',
    name: 'Icon',
    properties: { mainComponentId },
  };
}

describe('IconExportRegistry', () => {
  it('skips exportAsync when mainComponent was already exported', () => {
    const registry = new IconExportRegistry();
    const analysis = emptyIconAnalysis();

    const first = registry.registerAfterExport(
      '1:1',
      svgBytes,
      'image/svg+xml',
      undefined,
      instanceWire('1:1', 'MC1')
    );
    expect(first.emitAsset).toBe(true);

    const skip = registry.tryMainComponentSkip(instanceWire('1:2', 'MC1'), analysis);
    expect(skip).not.toBeNull();
    expect(skip?.canonicalNodeId).toBe('1:1');
    expect(registry.mcSkipCount).toBe(1);
    expect(registry.exportCallCount).toBe(1);
  });

  it('does not skip instances with different mainComponentId', () => {
    const registry = new IconExportRegistry();
    const analysis = emptyIconAnalysis();

    registry.registerAfterExport(
      '1:1',
      svgBytes,
      'image/svg+xml',
      undefined,
      instanceWire('1:1', 'MC1')
    );

    expect(registry.tryMainComponentSkip(instanceWire('1:2', 'MC2'), analysis)).toBeNull();
  });

  it('dedupes identical bytes across non-instance roots', () => {
    const registry = new IconExportRegistry();
    const frame = { id: '1:1', type: 'FRAME', name: 'F', properties: {} };

    const first = registry.registerAfterExport('1:1', svgBytes, 'image/svg+xml', undefined, frame);
    const second = registry.registerAfterExport('1:2', svgBytes, 'image/svg+xml', undefined, frame);

    expect(first.emitAsset).toBe(true);
    expect(second.emitAsset).toBe(false);
    expect(second.canonicalNodeId).toBe('1:1');
    expect(registry.uniqueIconAssets).toBe(1);
  });

  it('uses separate mainComponent keys for SVG and PNG routes', () => {
    const registry = new IconExportRegistry();
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const analysis = emptyIconAnalysis();

    registry.registerAfterExport(
      '1:1',
      svgBytes,
      'image/svg+xml',
      undefined,
      instanceWire('1:1', 'MC1')
    );
    registry.registerAfterExport('1:2', pngBytes, 'image/png', 2, instanceWire('1:2', 'MC1'));

    expect(registry.tryMainComponentSkip(instanceWire('1:3', 'MC1'), analysis)?.mimeType).toBe(
      'image/svg+xml'
    );
    expect(registry.mcSkipCount).toBe(1);
  });
});
