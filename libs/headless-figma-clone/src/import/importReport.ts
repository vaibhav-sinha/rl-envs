export interface ImportReport {
  skippedNodes: { figmaId: string; type: string; reason: string }[];
  skippedProperties: { figmaId: string; key: string }[];
}

export function createImportReport(): ImportReport {
  return { skippedNodes: [], skippedProperties: [] };
}

export function importVerbose(): boolean {
  return process.env.HFC_IMPORT_VERBOSE === '1';
}

export function importDebug(): boolean {
  return process.env.HFC_IMPORT_DEBUG === '1' || importVerbose();
}

export function importStrict(): boolean {
  return process.env.HFC_IMPORT_STRICT === '1';
}
