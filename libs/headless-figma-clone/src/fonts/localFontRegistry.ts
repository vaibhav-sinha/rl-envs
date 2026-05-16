import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { FontName } from '../model/types.js';
import type { FontFamilyManifest, FontFaceManifestEntry, FontMetricsJson } from './fontTypes.js';
import { DEFAULT_FONT } from './fontTypes.js';
import { getDefaultFontsDir } from './packageRoot.js';

function fontKey(family: string, style: string): string {
  return `${family}\0${style}`;
}

let fontsDir = getDefaultFontsDir();
let manifest: FontFamilyManifest | null = null;
const faceByKey = new Map<string, FontFaceManifestEntry>();
const metricsByKey = new Map<string, FontMetricsJson>();

function loadManifest(): FontFamilyManifest {
  if (manifest) return manifest;
  const path = join(fontsDir, 'inter', 'manifest.json');
  if (!existsSync(path)) {
    throw new Error(`Font manifest not found: ${path}`);
  }
  manifest = JSON.parse(readFileSync(path, 'utf8')) as FontFamilyManifest;
  for (const face of manifest.faces) {
    faceByKey.set(fontKey(face.family, face.style), face);
  }
  return manifest;
}

export function setFontsDir(dir: string): void {
  fontsDir = dir;
  manifest = null;
  faceByKey.clear();
  metricsByKey.clear();
}

export function setFontsDirForTests(dir: string | null): void {
  setFontsDir(dir ?? getDefaultFontsDir());
}

export function getFontsDir(): string {
  return fontsDir;
}

export function getInterManifest(): FontFamilyManifest {
  return loadManifest();
}

export function listLocalFontFaces(): FontName[] {
  const m = loadManifest();
  return m.faces.map((f) => ({ family: f.family, style: f.style }));
}

export function isFontAvailable(fontName: FontName): boolean {
  loadManifest();
  return faceByKey.has(fontKey(fontName.family, fontName.style));
}

export function getFontFaceEntry(fontName: FontName): FontFaceManifestEntry | undefined {
  loadManifest();
  return faceByKey.get(fontKey(fontName.family, fontName.style));
}

export function getFontMetrics(fontName: FontName): FontMetricsJson | undefined {
  const key = fontKey(fontName.family, fontName.style);
  const cached = metricsByKey.get(key);
  if (cached) return cached;

  const face = getFontFaceEntry(fontName);
  if (!face) return undefined;

  const metricsPath = join(fontsDir, 'inter', face.metrics);
  if (!existsSync(metricsPath)) return undefined;

  const data = JSON.parse(readFileSync(metricsPath, 'utf8')) as FontMetricsJson;
  metricsByKey.set(key, data);
  return data;
}

/** Closest Inter style by numeric weight when exact style is missing. */
export function closestInterStyleForWeight(weight: number): FontName {
  const m = loadManifest();
  let best = m.faces[0]!;
  let bestDist = Math.abs(best.fontWeight - weight);
  for (const face of m.faces) {
    const d = Math.abs(face.fontWeight - weight);
    if (d < bestDist) {
      best = face;
      bestDist = d;
    }
  }
  return { family: best.family, style: best.style };
}

export function fontWeightForStyle(fontName: FontName): number {
  const face = getFontFaceEntry(fontName);
  return face?.fontWeight ?? 400;
}

/** Build @font-face rules for faces under `baseUrl` (must end with /). */
export function getFontFaceCss(baseUrl: string, faces: FontName[]): string {
  loadManifest();
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const seen = new Set<string>();
  const rules: string[] = [];

  const emit = (fn: FontName) => {
    const key = fontKey(fn.family, fn.style);
    if (seen.has(key)) return;
    const face = getFontFaceEntry(fn);
    if (!face) return;
    seen.add(key);
    const familyEsc = face.family.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const url = `${normalizedBase}${encodeURIComponent(face.file)}`;
    rules.push(
      `@font-face{font-family:"${familyEsc}";font-style:${face.italic ? 'italic' : 'normal'};font-weight:${String(face.fontWeight)};font-display:swap;src:url("${url}") format("woff2");}`
    );
  };

  emit(DEFAULT_FONT);
  for (const fn of faces) {
    emit(fn);
  }

  return rules.join('\n');
}

export function resolveFontFilePath(fontName: FontName): string | undefined {
  const face = getFontFaceEntry(fontName);
  if (!face) return undefined;
  return join(fontsDir, 'inter', face.file);
}

/** file:// URL base for Playwright offline screenshots. */
export function getLocalFontsFileBaseUrl(): string {
  const interDir = join(fontsDir, 'inter').replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(interDir)) {
    return `file:///${interDir}/`;
  }
  return `file://${interDir}/`;
}
