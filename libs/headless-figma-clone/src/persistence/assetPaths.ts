import { basename, dirname, join } from 'node:path';

export function sidecarDirForHfcJson(absoluteJsonPath: string): string {
  const base = basename(absoluteJsonPath);
  if (!base.endsWith('.hfc.json')) {
    throw new Error(`assetPaths: expected *.hfc.json path, got ${base}`);
  }
  const stem = base.slice(0, -'.hfc.json'.length);
  return join(dirname(absoluteJsonPath), `${stem}.hfc.assets`);
}

/** Path relative to the directory containing the `.hfc.json` file. */
export function relativeAssetFile(absoluteJsonPath: string, sha256: string, ext: string): string {
  const base = basename(absoluteJsonPath);
  const stem = base.endsWith('.hfc.json') ? base.slice(0, -'.hfc.json'.length) : base;
  return `${stem}.hfc.assets/${sha256}.${ext}`;
}

export function absoluteAssetFile(absoluteJsonPath: string, sha256: string, ext: string): string {
  return join(dirname(absoluteJsonPath), relativeAssetFile(absoluteJsonPath, sha256, ext));
}
