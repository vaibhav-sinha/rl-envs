import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FontName } from '../model/types.js';
import type { FontFamilyManifest, FontFaceManifestEntry, FontMetricsJson } from './fontTypes.js';
import { DEFAULT_FONT } from './fontTypes.js';
import { getDefaultFontsDir } from './packageRoot.js';

function fontKey(family: string, style: string): string {
  return `${family}\0${style}`;
}

/** Subdirectory under fonts/ (e.g. inter, barlow). */
const BUNDLED_FAMILY_SLUGS = ['inter', 'barlow'] as const;

interface LoadedFamily {
  slug: string;
  manifest: FontFamilyManifest;
}

let fontsDir = getDefaultFontsDir();
const loadedFamilies: LoadedFamily[] = [];
const faceByKey = new Map<string, FontFaceManifestEntry & { slug: string }>();
const metricsByKey = new Map<string, FontMetricsJson>();

function familySlugForName(family: string): string | undefined {
  const hit = loadedFamilies.find((f) => f.manifest.family === family);
  return hit?.slug;
}

function loadManifests(): LoadedFamily[] {
  if (loadedFamilies.length > 0) return loadedFamilies;

  for (const slug of BUNDLED_FAMILY_SLUGS) {
    const path = join(fontsDir, slug, 'manifest.json');
    if (!existsSync(path)) {
      throw new Error(`Font manifest not found: ${path}`);
    }
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as FontFamilyManifest;
    const entry: LoadedFamily = { slug, manifest };
    loadedFamilies.push(entry);
    for (const face of manifest.faces) {
      faceByKey.set(fontKey(face.family, face.style), { ...face, slug });
    }
  }
  return loadedFamilies;
}

export function setFontsDir(dir: string): void {
  fontsDir = dir;
  loadedFamilies.length = 0;
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
  loadManifests();
  const inter = loadedFamilies.find((f) => f.slug === 'inter');
  if (!inter) throw new Error('Inter manifest not loaded');
  return inter.manifest;
}

export function listLocalFontFaces(): FontName[] {
  const families = loadManifests();
  const out: FontName[] = [];
  for (const { manifest } of families) {
    for (const face of manifest.faces) {
      out.push({ family: face.family, style: face.style });
    }
  }
  return out;
}

export function isFontAvailable(fontName: FontName): boolean {
  loadManifests();
  return faceByKey.has(fontKey(fontName.family, fontName.style));
}

export function isBundledFamily(family: string): boolean {
  loadManifests();
  return loadedFamilies.some((f) => f.manifest.family === family);
}

export function getFontFaceEntry(fontName: FontName): (FontFaceManifestEntry & { slug: string }) | undefined {
  loadManifests();
  return faceByKey.get(fontKey(fontName.family, fontName.style));
}

export function getFontMetrics(fontName: FontName): FontMetricsJson | undefined {
  const key = fontKey(fontName.family, fontName.style);
  const cached = metricsByKey.get(key);
  if (cached) return cached;

  const face = getFontFaceEntry(fontName);
  if (!face) return undefined;

  const metricsPath = join(fontsDir, face.slug, face.metrics);
  if (!existsSync(metricsPath)) return undefined;

  const data = JSON.parse(readFileSync(metricsPath, 'utf8')) as FontMetricsJson;
  metricsByKey.set(key, data);
  return data;
}

/** Closest bundled style by numeric weight when exact style is missing. */
export function closestStyleForWeight(family: string, weight: number): FontName {
  const families = loadManifests();
  const loaded = families.find((f) => f.manifest.family === family);
  const faces = loaded?.manifest.faces ?? getInterManifest().faces;
  let best = faces[0]!;
  let bestDist = Math.abs(best.fontWeight - weight);
  for (const face of faces) {
    const d = Math.abs(face.fontWeight - weight);
    if (d < bestDist) {
      best = face;
      bestDist = d;
    }
  }
  return { family: best.family, style: best.style };
}

/** @deprecated Use closestStyleForWeight('Inter', weight) */
export function closestInterStyleForWeight(weight: number): FontName {
  return closestStyleForWeight('Inter', weight);
}

export function fontWeightForStyle(fontName: FontName): number {
  const face = getFontFaceEntry(fontName);
  return face?.fontWeight ?? 400;
}

function fontFileUrl(baseUrl: string, slug: string, file: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${slug}/${encodeURIComponent(file)}`;
}

/** Build @font-face rules for faces under `baseUrl` (fonts root, must end with /). */
export function getFontFaceCss(baseUrl: string, faces: FontName[]): string {
  loadManifests();
  const seen = new Set<string>();
  const rules: string[] = [];

  const emit = (fn: FontName) => {
    const key = fontKey(fn.family, fn.style);
    if (seen.has(key)) return;
    const face = getFontFaceEntry(fn);
    if (!face) return;
    seen.add(key);
    const familyEsc = face.family.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const url = fontFileUrl(baseUrl, face.slug, face.file);
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
  return join(fontsDir, face.slug, face.file);
}

function fontsRootFileUrl(): string {
  const root = fontsDir.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(root)) {
    return `file:///${root}/`;
  }
  return `file://${root}/`;
}

/** file:// URL base for Playwright offline screenshots (fonts root). */
export function getLocalFontsFileBaseUrl(): string {
  return fontsRootFileUrl();
}

/** Slug for a bundled family name, if installed. */
export function getFamilySlug(family: string): string | undefined {
  loadManifests();
  return familySlugForName(family);
}

/** List bundled family slugs present under fontsDir. */
export function listBundledFamilySlugs(): string[] {
  if (!existsSync(fontsDir)) return [];
  return readdirSync(fontsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(join(fontsDir, name, 'manifest.json')));
}
