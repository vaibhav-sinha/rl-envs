import type { FontName } from '../model/types.js';

export interface FontFaceManifestEntry {
  family: string;
  style: string;
  fontWeight: number;
  italic: boolean;
  file: string;
  metrics: string;
}

export interface FontFamilyManifest {
  version: number;
  family: string;
  defaultStyle: string;
  faces: FontFaceManifestEntry[];
}

export interface FontMetricsJson {
  version: number;
  family: string;
  style: string;
  fontWeight: number;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
  autoLineHeightEm: number;
  avgAdvanceEm: number;
  advancesEm: Record<string, number>;
}

export interface FontAvailabilityEntry {
  requested: FontName;
  available: boolean;
  substitutedTo?: FontName;
}

export const DEFAULT_FONT: FontName = { family: 'Inter', style: 'Regular' };
