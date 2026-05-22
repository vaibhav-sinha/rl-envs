import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { repoRoot } from './config.js';
import { debugLogForExport, exportDebugEnabled } from './export-instance-debug.js';
import type { HfcAssetFileRef, ImportHfcResponse } from './hfc-client.js';

type HfcExportHandler = typeof import('../../headless-figma-clone/dist/import/exportHandler.js');

let handlerModule: HfcExportHandler | undefined;

function hfcExportHandlerPath(): string {
  return join(repoRoot, 'libs', 'headless-figma-clone', 'dist', 'import', 'exportHandler.js');
}

export function isLocalHfcImportAvailable(): boolean {
  return existsSync(hfcExportHandlerPath());
}

async function loadHfcHandler(): Promise<HfcExportHandler> {
  if (handlerModule) return handlerModule;
  const path = hfcExportHandlerPath();
  if (!existsSync(path)) {
    throw new Error(
      `HFC not built for in-process import (missing ${path}). Run: cd libs/headless-figma-clone && npm run build`
    );
  }
  const mod = await import(pathToFileURL(path).href);
  handlerModule = mod;
  return mod;
}

function logSnapshotInstances(stage: string, snapshot: unknown, exportId?: string): void {
  if (!exportDebugEnabled()) return;
  const doc = (snapshot as { document?: { children?: unknown[] } })?.document;
  if (!doc) return;
  const dbg = exportId ? debugLogForExport(exportId) : null;
  if (dbg) {
    dbg.walkAssembledDocument(stage, doc as Parameters<typeof dbg.walkAssembledDocument>[1]);
  }
}

/** Convert snapshot in memory via HFC (no JSON.stringify of the full document tree). */
export async function importFigmaSnapshotInProcess(
  hfcFileName: string,
  snapshot: unknown,
  assetFiles: HfcAssetFileRef[],
  exportId?: string
): Promise<ImportHfcResponse> {
  logSnapshotInstances('import_in_process_before', snapshot, exportId);
  const mod = await loadHfcHandler();
  if (exportDebugEnabled() && exportId) {
    debugLogForExport(exportId).log('import_in_process', `handler=${hfcExportHandlerPath()}`);
  }
  const converted = mod.convertFigmaSnapshot({
    hfcFileName,
    snapshot,
    assetFiles,
  });
  if (exportDebugEnabled() && exportId) {
    debugLogForExport(exportId).walkImportEnvelope('import_in_process_after', converted.envelope);
  }
  return {
    fileKey: converted.fileKey,
    fileName: converted.fileName,
    slug: converted.slug,
    envelope: converted.envelope,
    assets: converted.assets,
    figmaToHfc: converted.figmaToHfc,
  };
}
