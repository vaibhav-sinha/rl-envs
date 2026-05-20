import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { repoRoot } from './config.js';
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

/** Convert snapshot in memory via HFC (no JSON.stringify of the full document tree). */
export async function importFigmaSnapshotInProcess(
  hfcFileName: string,
  snapshot: unknown,
  assetFiles: HfcAssetFileRef[]
): Promise<ImportHfcResponse> {
  const mod = await loadHfcHandler();
  const converted = mod.convertFigmaSnapshot({
    hfcFileName,
    snapshot,
    assetFiles,
  });
  return {
    fileKey: converted.fileKey,
    fileName: converted.fileName,
    slug: converted.slug,
    envelope: converted.envelope,
    assets: converted.assets,
    figmaToHfc: converted.figmaToHfc,
  };
}
