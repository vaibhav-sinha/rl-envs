import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { partsFileHasSessionEnd } from './export-parts-util.js';
import type { ExportTotals } from './stream-protocol.js';

export const SESSION_MANIFEST_FILE = 'session.json';
export const FINISH_REQUEST_FILE = 'finish-request.json';

export interface ExportSessionManifest {
  exportId: string;
  streamProtocol: number;
  hfcFileName: string;
  figmaFileKey: string | null;
  figmaFileName: string;
  totals: ExportTotals;
  partsReceived: number;
  sessionEnd: boolean;
  finished: boolean;
  finishedAt: string | null;
  lastError: string | null;
  resultSlug?: string;
  resultFilePath?: string;
}

export function defaultManifest(exportId: string): ExportSessionManifest {
  return {
    exportId,
    streamProtocol: 3,
    hfcFileName: 'Untitled',
    figmaFileKey: null,
    figmaFileName: 'Untitled',
    totals: { nodes: 0, iconExports: 0, rasterImages: 0 },
    partsReceived: 0,
    sessionEnd: false,
    finished: false,
    finishedAt: null,
    lastError: null,
  };
}

export function readSessionManifest(sessionDir: string): ExportSessionManifest | null {
  const path = join(sessionDir, SESSION_MANIFEST_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as ExportSessionManifest;
}

export function writeSessionManifest(sessionDir: string, manifest: ExportSessionManifest): void {
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(join(sessionDir, SESSION_MANIFEST_FILE), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

export function patchSessionManifest(
  sessionDir: string,
  patch: Partial<ExportSessionManifest>
): ExportSessionManifest {
  const current = readSessionManifest(sessionDir) ?? defaultManifest(patch.exportId ?? 'unknown');
  const next = { ...current, ...patch };
  writeSessionManifest(sessionDir, next);
  return next;
}

export interface FinishRequestRecord {
  standaloneFileName?: string;
  exportMode?: 'new' | 're';
  reexportTarget?: string;
  source?: 'auto' | 'memory' | 'disk';
  savedAt: string;
}

export function writeFinishRequest(sessionDir: string, options: FinishRequestRecord): void {
  writeFileSync(join(sessionDir, FINISH_REQUEST_FILE), JSON.stringify(options, null, 2) + '\n', 'utf8');
}

export function readFinishRequest(sessionDir: string): FinishRequestRecord | null {
  const path = join(sessionDir, FINISH_REQUEST_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as FinishRequestRecord;
}

export interface ExportSessionListEntry {
  exportId: string;
  hfcFileName: string;
  figmaFileName: string;
  sessionEnd: boolean;
  finished: boolean;
  partsReceived: number;
  lastError: string | null;
}

export function listExportSessions(sessionsDir: string, status?: 'ready' | 'all'): ExportSessionListEntry[] {
  if (!existsSync(sessionsDir)) return [];
  const entries: ExportSessionListEntry[] = [];
  for (const name of readdirSync(sessionsDir, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (!/^[a-f0-9-]{36}$/i.test(name.name)) continue;
    const sessionDir = join(sessionsDir, name.name);
    const manifest = readSessionManifest(sessionDir);
    const partsPath = join(sessionDir, 'parts.jsonl');
    if (!existsSync(partsPath)) continue;
    const sessionEnd =
      manifest?.sessionEnd ??
      (existsSync(partsPath) ? partsFileHasSessionEnd(partsPath) : false);
    const finished = manifest?.finished ?? false;
    if (status === 'ready' && (!sessionEnd || finished)) continue;
    entries.push({
      exportId: manifest?.exportId ?? name.name,
      hfcFileName: manifest?.hfcFileName ?? 'Untitled',
      figmaFileName: manifest?.figmaFileName ?? 'Untitled',
      sessionEnd,
      finished,
      partsReceived: manifest?.partsReceived ?? 0,
      lastError: manifest?.lastError ?? null,
    });
  }
  return entries.sort((a, b) => b.partsReceived - a.partsReceived);
}
