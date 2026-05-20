import type { SerializedNodeWire } from '../streamProtocol.js';
import {
  ICON_RASTER_EXPORT_SCALE,
  prefersRasterIconExport,
  type IconTreeAnalysis,
} from './iconDetector.js';
import {
  ExportAssetDedup,
  type NodeExportRegistration,
  type NodeIconMime,
} from './exportAssetDedup.js';

export interface MainComponentSkip {
  canonicalNodeId: string;
  mimeType: NodeIconMime;
  exportScale?: number;
}

interface McEntry {
  canonicalNodeId: string;
  mimeType: NodeIconMime;
  exportScale?: number;
}

/**
 * Content-addressed icon dedup plus mainComponent fast-path.
 *
 * Instances sharing a mainComponentId reuse the first successful export's canonical
 * node id (visual overrides on later placements are not re-exported).
 */
export class IconExportRegistry {
  private readonly dedup = new ExportAssetDedup();
  private readonly mcKeyToEntry = new Map<string, McEntry>();
  private iconExportCalls = 0;
  private iconMcSkips = 0;

  private mcKey(mainComponentId: string, mimeType: NodeIconMime, exportScale?: number): string {
    if (mimeType === 'image/png') {
      return `png:${exportScale ?? ICON_RASTER_EXPORT_SCALE}:${mainComponentId}`;
    }
    return `svg:${mainComponentId}`;
  }

  tryMainComponentSkip(
    wire: SerializedNodeWire,
    analysis: IconTreeAnalysis
  ): MainComponentSkip | null {
    if (wire.type !== 'INSTANCE') return null;
    const mcId = wire.properties.mainComponentId;
    if (typeof mcId !== 'string' || !mcId) return null;

    const serialized = {
      id: wire.id,
      type: wire.type,
      name: wire.name,
      properties: wire.properties,
    };
    const usePng = prefersRasterIconExport(serialized, analysis);
    const mimeType: NodeIconMime = usePng ? 'image/png' : 'image/svg+xml';
    const exportScale = usePng ? ICON_RASTER_EXPORT_SCALE : undefined;
    const entry = this.mcKeyToEntry.get(this.mcKey(mcId, mimeType, exportScale));
    if (!entry) return null;

    this.iconMcSkips += 1;
    return {
      canonicalNodeId: entry.canonicalNodeId,
      mimeType: entry.mimeType,
      exportScale: entry.exportScale,
    };
  }

  registerAfterExport(
    nodeId: string,
    bytes: Uint8Array,
    mimeType: NodeIconMime,
    exportScale: number | undefined,
    wire: SerializedNodeWire | undefined
  ): NodeExportRegistration {
    this.iconExportCalls += 1;
    const reg = this.dedup.registerNodeExport(nodeId, bytes, mimeType, exportScale);

    if (wire?.type === 'INSTANCE') {
      const mcId = wire.properties.mainComponentId;
      if (typeof mcId === 'string' && mcId) {
        const key = this.mcKey(mcId, mimeType, exportScale);
        if (!this.mcKeyToEntry.has(key)) {
          this.mcKeyToEntry.set(key, {
            canonicalNodeId: reg.canonicalNodeId,
            mimeType,
            exportScale,
          });
        }
      }
    }

    return reg;
  }

  get uniqueIconAssets(): number {
    return this.dedup.uniqueCount;
  }

  get skippedDuplicateCount(): number {
    return this.dedup.skippedDuplicateCount;
  }

  get exportCallCount(): number {
    return this.iconExportCalls;
  }

  get mcSkipCount(): number {
    return this.iconMcSkips;
  }
}
