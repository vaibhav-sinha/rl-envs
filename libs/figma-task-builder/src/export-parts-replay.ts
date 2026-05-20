import { createReadStream, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { applyStreamPart, SnapshotAssembler } from './snapshot-assembler.js';
import {
  defaultManifest,
  type ExportSessionManifest,
} from './export-session-manifest.js';
import { parseStreamPartLine, type StreamPart } from './stream-protocol.js';

/** Below this size, replay uses a buffered read (faster); above, line streaming avoids one giant string. */
const REPLAY_BUFFER_MAX_BYTES = 64 * 1024 * 1024;

export async function replayPartsIntoAssembler(
  sessionDir: string,
  exportId: string
): Promise<SnapshotAssembler> {
  const assembler = new SnapshotAssembler();
  const partsPath = join(sessionDir, 'parts.jsonl');
  const size = statSync(partsPath).size;

  const applyLine = (raw: string): void => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const part = parseStreamPartLine(stripAssetBase64ForReplay(trimmed));
    if (part.kind === 'session_end' && part.exportId !== exportId) {
      throw new Error('SESSION_END_ID_MISMATCH');
    }
    applyStreamPart(assembler, part);
  };

  if (size <= REPLAY_BUFFER_MAX_BYTES) {
    for (const line of readFileSync(partsPath, 'utf8').split('\n')) {
      applyLine(line);
    }
    return assembler;
  }

  const rl = createInterface({
    input: createReadStream(partsPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    applyLine(line);
  }

  return assembler;
}

/** Build session.json fields from an on-disk parts.jsonl (legacy sessions without manifest). */
export async function inferSessionManifestFromParts(
  sessionDir: string,
  exportId: string
): Promise<ExportSessionManifest> {
  const manifest = defaultManifest(exportId);
  let partsReceived = 0;
  const partsPath = join(sessionDir, 'parts.jsonl');
  const rl = createInterface({
    input: createReadStream(partsPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    partsReceived += 1;
    const part = parseStreamPartLine(trimmed);
    if (part.kind === 'session_start') {
      manifest.streamProtocol = part.streamProtocol;
      manifest.hfcFileName = part.hfcFileName;
      manifest.figmaFileKey = part.figmaFileKey;
      manifest.figmaFileName = part.figmaFileName;
      manifest.totals = part.totals;
    } else if (part.kind === 'session_totals') {
      manifest.totals = {
        nodes: part.nodes,
        iconExports: part.iconExports,
        rasterImages: part.rasterImages,
      };
    } else if (part.kind === 'session_end') {
      manifest.sessionEnd = true;
    }
  }

  manifest.partsReceived = partsReceived;
  return manifest;
}

/** Drop legacy inline base64 before JSON.parse so replay does not allocate giant strings. */
export function stripAssetBase64ForReplay(line: string): string {
  const key = '"bytesBase64"';
  const i = line.indexOf(key);
  if (i < 0) return line;
  const colon = line.indexOf(':', i + key.length);
  if (colon < 0) return line;
  let j = colon + 1;
  while (j < line.length && /\s/.test(line[j]!)) j++;
  if (line[j] !== '"') return line;
  j++;
  while (j < line.length) {
    const ch = line[j]!;
    if (ch === '\\') {
      j += 2;
      continue;
    }
    if (ch === '"') {
      return line.slice(0, colon + 1) + '""' + line.slice(j + 1);
    }
    j++;
  }
  return line;
}

export function streamPartLineForSpool(part: StreamPart): string {
  if (part.kind !== 'asset') {
    return JSON.stringify(part) + '\n';
  }
  const stub: Record<string, unknown> = {
    kind: 'asset',
    contentHash: part.contentHash,
    mimeType: part.mimeType,
  };
  if (part.figmaNodeId) stub.figmaNodeId = part.figmaNodeId;
  if (part.figmaImageHash) stub.figmaImageHash = part.figmaImageHash;
  if (part.exportScale !== undefined) stub.exportScale = part.exportScale;
  return JSON.stringify(stub) + '\n';
}
