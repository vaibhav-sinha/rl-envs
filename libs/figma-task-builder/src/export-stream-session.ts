import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { writeAssembledToDisk } from './assembled-writer.js';
import type { TaskBuilderConfig } from './config.js';
import { streamPartLineForSpool } from './export-parts-replay.js';
import { inferSessionManifestFromParts, replayPartsIntoAssembler } from './export-parts-replay.js';
import { partsFileHasSessionEnd } from './export-parts-util.js';
import {
  defaultManifest,
  listExportSessions,
  patchSessionManifest,
  readFinishRequest,
  readSessionManifest,
  writeFinishRequest,
  writeSessionManifest,
  type ExportSessionListEntry,
  type FinishRequestRecord,
} from './export-session-manifest.js';
import { HfcClient, type HfcAssetFileRef } from './hfc-client.js';
import { importFigmaSnapshotInProcess, isLocalHfcImportAvailable } from './hfc-import-local.js';
import { assembledToFigmaPluginSnapshot } from './snapshot-assembler.js';
import { applyStreamPart, SnapshotAssembler, type AssembledAsset } from './snapshot-assembler.js';
import {
  EXPORT_STREAM_PART_MAX_BYTES,
  parseStreamPartLine,
  type StreamPart,
} from './stream-protocol.js';
import {
  clearDebugLogForExport,
  debugLogForExport,
  exportDebugEnabled,
} from './export-instance-debug.js';
import { TasksStore } from './tasks-store.js';

export type FinishStreamSource = 'auto' | 'memory' | 'disk';

export interface ExportStreamSessionInfo {
  exportId: string;
  uploadUrl: string;
}

export interface FinishStreamOptions {
  taskId?: string;
  mode?: 'full' | 'exclude';
  excludeNodeIds?: string[];
  standaloneFileName?: string;
  source?: FinishStreamSource;
}

export interface FinishStreamResult {
  exportId: string;
  saved?: boolean;
  filePath?: string;
  slug?: string;
  replayedFromDisk?: boolean;
}

export class ExportStreamSessionStore {
  private readonly sessionsDir: string;
  private readonly assemblers = new Map<string, SnapshotAssembler>();

  constructor(private readonly config: TaskBuilderConfig) {
    this.sessionsDir = join(config.tasksDir, '.export-sessions');
    mkdirSync(this.sessionsDir, { recursive: true });
  }

  get sessionsRoot(): string {
    return this.sessionsDir;
  }

  createSession(): ExportStreamSessionInfo {
    const exportId = randomUUID();
    const dir = sessionDir(this.sessionsDir, exportId);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'assets'), { recursive: true });
    writeFileSync(join(dir, 'parts.jsonl'), '', 'utf8');
    writeSessionManifest(dir, defaultManifest(exportId));
    const assembler = new SnapshotAssembler();
    assembler.setDebugExportId(exportId);
    this.assemblers.set(exportId, assembler);
    return {
      exportId,
      uploadUrl: `/export/stream/${exportId}/part`,
    };
  }

  appendPart(exportId: string, body: string): { seq: number; lineCount: number } {
    const dir = sessionDir(this.sessionsDir, exportId);
    if (!existsSync(dir)) throw new Error(`NOT_FOUND: export session ${exportId}`);

    const assembler = this.assemblers.get(exportId);
    if (!assembler) throw new Error(`NOT_FOUND: export session assembler ${exportId}`);

    const lines = splitNdjsonBody(body);
    if (lines.length === 0) throw new Error('EMPTY_PART_LINE');

    const seq = nextSeq(dir);
    const partsPath = join(dir, 'parts.jsonl');
    const chunks: string[] = [];

    for (const trimmed of lines) {
      if (trimmed.length > EXPORT_STREAM_PART_MAX_BYTES) {
        throw new Error('PART_LINE_TOO_LARGE');
      }
      const part = parseStreamPartLine(trimmed);
      if (part.kind === 'tree_enter') {
        debugLogForExport(exportId).logWirePart('stream_part_parsed', part);
      } else if (part.kind === 'node_props') {
        debugLogForExport(exportId).logWirePart('stream_part_parsed', part);
      }
      applyStreamPart(assembler, part);
      chunks.push(streamPartLineForSpool(part));
      if (part.kind === 'asset') {
        writeAssetFile(dir, part);
      }
      updateManifestForPart(dir, exportId, part);
    }

    writeFileSync(partsPath, chunks.join(''), { encoding: 'utf8', flag: 'a' });
    const manifest = readSessionManifest(dir);
    if (manifest) {
      patchSessionManifest(dir, { partsReceived: manifest.partsReceived + lines.length });
    }
    return { seq, lineCount: lines.length };
  }

  async finish(exportId: string, options: FinishStreamOptions): Promise<FinishStreamResult> {
    const dir = sessionDir(this.sessionsDir, exportId);
    if (!existsSync(dir)) throw new Error(`NOT_FOUND: export session ${exportId}`);

    let manifest = readSessionManifest(dir);
    if (!manifest) {
      manifest = await inferSessionManifestFromParts(dir, exportId);
      writeSessionManifest(dir, manifest);
    }
    if (manifest.finished) {
      return {
        exportId,
        slug: manifest.resultSlug,
        filePath: manifest.resultFilePath,
        replayedFromDisk: options.source === 'disk',
      };
    }

    const partsPath = join(dir, 'parts.jsonl');
    if (!manifest.sessionEnd && existsSync(partsPath) && partsFileHasSessionEnd(partsPath)) {
      patchSessionManifest(dir, { sessionEnd: true });
      manifest = { ...manifest, sessionEnd: true };
    }
    if (!manifest.sessionEnd) {
      throw new Error('SESSION_NOT_ENDED: export stream has not received session_end');
    }

    writeFinishRequest(dir, {
      ...options,
      source: options.source ?? 'auto',
      savedAt: new Date().toISOString(),
    });

    const source = options.source ?? 'auto';
    let replayedFromDisk = false;
    let assembler: SnapshotAssembler;

    try {
      if (source === 'disk') {
        this.assemblers.delete(exportId);
        assembler = await replayPartsIntoAssembler(dir, exportId);
        replayedFromDisk = true;
      } else if (source === 'memory') {
        const mem = this.assemblers.get(exportId);
        if (!mem) throw new Error('NOT_FOUND: export session assembler (restart? use source=disk)');
        assembler = mem;
      } else {
        const mem = this.assemblers.get(exportId);
        if (mem) {
          assembler = mem;
        } else {
          assembler = await replayPartsIntoAssembler(dir, exportId);
          replayedFromDisk = true;
        }
      }
      assembler.setDebugExportId(exportId);

      const dbg = debugLogForExport(exportId);
      const assembled = assembler.finish();
      this.assemblers.delete(exportId);

      dbg.walkAssembledDocument('assembler_finish', assembled.document);
      dbg.log('finish', `replayedFromDisk=${replayedFromDisk} source=${source}`);

      const assetFiles = assetFilesFromSession(dir, assembled);
      const fileName =
        options.standaloneFileName ??
        manifest?.hfcFileName ??
        assembled.figmaFileName;
      const snapshot = assembledToFigmaPluginSnapshot({ ...assembled, assets: [] });
      dbg.walkAssembledDocument('snapshot_for_import', snapshot.document);

      const useHttpOnly = process.env.TB_HFC_HTTP_ONLY === '1';
      const inProcess = !useHttpOnly && isLocalHfcImportAvailable();
      dbg.log(
        'import_route',
        `inProcess=${inProcess} TB_HFC_HTTP_ONLY=${process.env.TB_HFC_HTTP_ONLY ?? ''} hfcUrl=${this.config.hfcUrl}`
      );

      const imported = inProcess
        ? await importFigmaSnapshotInProcess(fileName, snapshot, assetFiles, exportId)
        : await (async () => {
            writeAssembledToDisk(dir, assembled);
            dbg.log('import_route', 'using HTTP importFromSession (assembled written to disk)');
            const hfc = new HfcClient(this.config.hfcUrl);
            const res = await hfc.importFromSession(
              resolve(dir),
              fileName,
              assetFiles,
              this.config.exportSessionsDir
            );
            dbg.walkImportEnvelope('import_http_envelope', res.envelope);
            return res;
          })();

      dbg.walkImportEnvelope('import_envelope', imported.envelope);

      const store = new TasksStore(this.config);
      let result: FinishStreamResult = { exportId, slug: imported.slug, replayedFromDisk };

      if (options.taskId) {
        const applied = store.applyTaskExportImport(
          options.taskId,
          imported,
          options.mode ?? 'full',
          options.excludeNodeIds
        );
        result = { ...result, saved: applied.saved };
      } else if (options.standaloneFileName ?? manifest?.hfcFileName) {
        const standalone = store.persistStandaloneImport(imported, exportId);
        result = { ...result, filePath: standalone.filePath };
        dbg.log('persist', `filePath=${standalone.filePath}`);
      }

      dbg.flush(dir);
      clearDebugLogForExport(exportId);

      patchSessionManifest(dir, {
        finished: true,
        finishedAt: new Date().toISOString(),
        lastError: null,
        resultSlug: imported.slug,
        resultFilePath: result.filePath,
      });

      if (!exportDebugEnabled()) {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          /* best-effort cleanup */
        }
      } else {
        dbg.log('finish', `TB_EXPORT_DEBUG=1: session kept at ${dir}`);
      }

      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      patchSessionManifest(dir, { lastError: message });
      throw e;
    }
  }

  async replayFinish(exportId: string, options: Omit<FinishStreamOptions, 'source'>): Promise<FinishStreamResult> {
    const saved = readFinishRequest(sessionDir(this.sessionsDir, exportId));
    return this.finish(exportId, {
      ...saved,
      ...options,
      source: 'disk',
    });
  }

  listSessions(status?: 'ready' | 'all'): ExportSessionListEntry[] {
    return listExportSessions(this.sessionsDir, status);
  }
}

function updateManifestForPart(dir: string, exportId: string, part: StreamPart): void {
  if (part.kind === 'session_start') {
    patchSessionManifest(dir, {
      exportId,
      streamProtocol: part.streamProtocol,
      hfcFileName: part.hfcFileName,
      figmaFileKey: part.figmaFileKey,
      figmaFileName: part.figmaFileName,
      totals: part.totals,
    });
    return;
  }
  if (part.kind === 'session_totals') {
    patchSessionManifest(dir, {
      totals: {
        nodes: part.nodes,
        iconExports: part.iconExports,
        rasterImages: part.rasterImages,
      },
    });
    return;
  }
  if (part.kind === 'session_end') {
    patchSessionManifest(dir, { sessionEnd: true });
  }
}

function sessionDir(sessionsDir: string, exportId: string): string {
  if (!/^[a-f0-9-]{36}$/i.test(exportId)) {
    throw new Error('INVALID_EXPORT_ID');
  }
  return join(sessionsDir, exportId);
}

function nextSeq(dir: string): number {
  const seqPath = join(dir, 'seq.txt');
  let seq = 0;
  if (existsSync(seqPath)) {
    seq = Number.parseInt(readFileSync(seqPath, 'utf8'), 10) || 0;
  }
  seq += 1;
  writeFileSync(seqPath, String(seq), 'utf8');
  return seq;
}

/** Split request body into NDJSON lines (supports batched tree uploads). */
export function splitNdjsonBody(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function writeAssetFile(dir: string, part: Extract<StreamPart, { kind: 'asset' }>): void {
  if (!part.bytesBase64) {
    throw new Error('ASSET_BYTES_REQUIRED_FOR_WRITE');
  }
  const ext = mimeToExt(part.mimeType);
  const buf = Buffer.from(part.bytesBase64, 'base64');
  const hash = createHash('sha256').update(buf).digest('hex');
  const assetPath = join(dir, 'assets', `${hash}.${ext}`);
  if (!existsSync(assetPath)) {
    writeFileSync(assetPath, buf);
  }
}

function assetFilesFromSession(
  dir: string,
  assembled: { assets: AssembledAsset[] }
): HfcAssetFileRef[] {
  return assembled.assets.map((a) => {
    const ext = mimeToExt(a.mimeType);
    const assetPath = join(dir, 'assets', `${a.contentHash}.${ext}`);
    if (!existsSync(assetPath)) {
      throw new Error(`MISSING_ASSET_FILE: ${a.contentHash}`);
    }
    return {
      path: assetPath,
      mimeType: a.mimeType,
      figmaNodeId: a.figmaNodeId,
      figmaImageHash: a.figmaImageHash,
      exportScale: a.exportScale,
    };
  });
}

function mimeToExt(mime: AssembledAsset['mimeType']): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}
