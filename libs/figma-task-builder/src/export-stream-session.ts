import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskBuilderConfig } from './config.js';
import { HfcClient, type HfcAssetFileRef } from './hfc-client.js';
import {
  assembledToFigmaPluginSnapshot,
  SnapshotAssembler,
  type AssembledAsset,
} from './snapshot-assembler.js';
import {
  EXPORT_STREAM_PART_MAX_BYTES,
  parseStreamPartLine,
  type StreamPart,
} from './stream-protocol.js';
import { TasksStore } from './tasks-store.js';

export interface ExportStreamSessionInfo {
  exportId: string;
  uploadUrl: string;
}

export interface FinishStreamOptions {
  taskId?: string;
  mode?: 'full' | 'exclude';
  excludeNodeIds?: string[];
  standaloneFileName?: string;
}

export interface FinishStreamResult {
  exportId: string;
  saved?: boolean;
  filePath?: string;
  slug?: string;
}

export class ExportStreamSessionStore {
  private readonly sessionsDir: string;

  constructor(private readonly config: TaskBuilderConfig) {
    this.sessionsDir = join(config.tasksDir, '.export-sessions');
    mkdirSync(this.sessionsDir, { recursive: true });
  }

  createSession(): ExportStreamSessionInfo {
    const exportId = randomUUID();
    const dir = sessionDir(this.sessionsDir, exportId);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'assets'), { recursive: true });
    writeFileSync(join(dir, 'parts.jsonl'), '', 'utf8');
    return {
      exportId,
      uploadUrl: `/export/stream/${exportId}/part`,
    };
  }

  appendPart(exportId: string, body: string): { seq: number; lineCount: number } {
    const dir = sessionDir(this.sessionsDir, exportId);
    if (!existsSync(dir)) throw new Error(`NOT_FOUND: export session ${exportId}`);

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
      chunks.push(trimmed + '\n');
      if (part.kind === 'asset') {
        writeAssetFile(dir, part);
      }
    }

    writeFileSync(partsPath, chunks.join(''), { encoding: 'utf8', flag: 'a' });
    return { seq, lineCount: lines.length };
  }

  async finish(exportId: string, options: FinishStreamOptions): Promise<FinishStreamResult> {
    const dir = sessionDir(this.sessionsDir, exportId);
    if (!existsSync(dir)) throw new Error(`NOT_FOUND: export session ${exportId}`);

    const assembler = new SnapshotAssembler();
    const lines = readFileSync(join(dir, 'parts.jsonl'), 'utf8').split('\n').filter(Boolean);

    for (const line of lines) {
      const part = parseStreamPartLine(line);
      switch (part.kind) {
        case 'session_start':
          assembler.applySessionStart(part);
          break;
        case 'meta':
          assembler.applyMeta(part);
          break;
        case 'tree_enter':
          assembler.applyTreeEnter(part);
          break;
        case 'tree_exit':
          assembler.applyTreeExit();
          break;
        case 'asset':
          assembler.applyAsset(part);
          break;
        case 'session_end':
          if (part.exportId !== exportId) {
            throw new Error('SESSION_END_ID_MISMATCH');
          }
          break;
      }
    }

    const assembled = assembler.finish();
    const assetFiles = assetFilesFromSession(dir, assembled);
    const snapshot = assembledToFigmaPluginSnapshot({ ...assembled, assets: [] });
    const hfc = new HfcClient(this.config.hfcUrl);
    const fileName = options.standaloneFileName ?? assembled.figmaFileName;
    const imported = await hfc.importSnapshot(fileName, snapshot, assetFiles);

    const store = new TasksStore(this.config);
    let result: FinishStreamResult = { exportId, slug: imported.slug };

    if (options.taskId) {
      const applied = store.applyTaskExportImport(
        options.taskId,
        imported,
        options.mode ?? 'full',
        options.excludeNodeIds
      );
      result = { ...result, saved: applied.saved };
    } else if (options.standaloneFileName) {
      const standalone = store.persistStandaloneImport(imported);
      result = { ...result, filePath: standalone.filePath };
    }

    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }

    return result;
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
