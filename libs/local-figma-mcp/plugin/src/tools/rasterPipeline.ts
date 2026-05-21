import { logExportError } from '../exportError.js';
import type { ExportUploadGate } from '../exportUploadGate.js';
import type { ExportMetricsCollector } from '../exportMetrics.js';
import { RASTER_IMAGE_CONCURRENCY, streamPartToLine } from '../streamProtocol.js';
import type { StreamPart } from '../streamProtocol.js';
import { poolMapStream } from './asyncPool.js';
import { BLANK_PNG_BYTES } from '../blankPng.js';
import { bytesToBase64 } from './serializeValue.js';
import { sha256Hex } from './sha256.js';

type AssetMime = Extract<StreamPart, { kind: 'asset' }>['mimeType'];

function assetPartFromBytes(
  bytes: Uint8Array,
  mimeType: AssetMime,
  figmaImageHash: string
): Extract<StreamPart, { kind: 'asset' }> {
  return {
    kind: 'asset',
    contentHash: sha256Hex(bytes),
    mimeType,
    bytesBase64: bytesToBase64(bytes),
    figmaImageHash,
  };
}

function sniffMime(bytes: Uint8Array): AssetMime {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return 'image/png';
}

export interface RasterPipelineProgress {
  fetched: number;
  uploaded: number;
  total: number;
}

export type RasterProgressCallback = (progress: RasterPipelineProgress) => void;

/** Stay under Figma's ~10s image/bridge timeout so we can fall back to a blank PNG. */
const GET_BYTES_TIMEOUT_MS = 9_000;

async function fetchRasterBytes(img: Image, hash: string): Promise<Uint8Array> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      img.getBytesAsync(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`getBytesAsync timed out after ${GET_BYTES_TIMEOUT_MS}ms`)),
          GET_BYTES_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Pipelined raster fetch + upload (can run concurrently with icon export). */
export class RasterExportPipeline {
  private readonly seenContentKeys = new Set<string>();
  private fetched = 0;
  private uploaded = 0;
  private readonly runPromise: Promise<void>;
  private drainResolve: (() => void) | null = null;
  private drainPromise: Promise<void>;

  constructor(
    private readonly hashes: readonly string[],
    private readonly gate: ExportUploadGate,
    private readonly metrics: ExportMetricsCollector,
    private readonly onProgress: RasterProgressCallback
  ) {
    this.drainPromise = new Promise<void>((resolve) => {
      this.drainResolve = resolve;
    });
    this.runPromise = this.run();
  }

  get total(): number {
    return this.hashes.length;
  }

  get progress(): RasterPipelineProgress {
    return { fetched: this.fetched, uploaded: this.uploaded, total: this.hashes.length };
  }

  private emitProgress(): void {
    this.onProgress(this.progress);
  }

  private async run(): Promise<void> {
    if (this.hashes.length === 0) {
      this.drainResolve?.();
      return;
    }

    this.metrics.beginImagesFetch();
    try {
      for await (const row of poolMapStream(this.hashes, RASTER_IMAGE_CONCURRENCY, async (hash) => {
        try {
          const img = figma.getImageByHash(hash);
          if (!img) {
            return { hash, bytes: BLANK_PNG_BYTES, mime: 'image/png' as const };
          }
          const bytes = await fetchRasterBytes(img, hash);
          return { hash, bytes, mime: sniffMime(bytes) };
        } catch (error) {
          logExportError(`raster/getBytesAsync hash=${hash}`, error, 'warn');
          return { hash, bytes: BLANK_PNG_BYTES, mime: 'image/png' as const };
        }
      })) {
        this.fetched += 1;
        this.emitProgress();

        const contentKey = `${row.mime}:${sha256Hex(row.bytes)}`;
        if (this.seenContentKeys.has(contentKey)) continue;
        this.seenContentKeys.add(contentKey);

        this.metrics.beginImagesUpload();
        try {
          await this.gate.postRasterAsset(
            streamPartToLine(assetPartFromBytes(row.bytes, row.mime, row.hash))
          );
        } catch (error) {
          logExportError(`raster/postAsset hash=${row.hash}`, error, 'warn');
          // Keep going — a single asset or progress post must not fail the whole export.
        } finally {
          this.metrics.endImagesUpload();
        }
        this.uploaded += 1;
        this.emitProgress();
      }
    } finally {
      this.metrics.endImagesFetch();
      this.drainResolve?.();
    }
  }

  /** Wait until all raster hashes are fetched and unique assets uploaded. */
  async drain(): Promise<void> {
    await this.runPromise;
    await this.drainPromise;
  }
}
