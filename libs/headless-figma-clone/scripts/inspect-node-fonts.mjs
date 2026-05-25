#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolveHfcNodeIdBySourceFigmaId } from '../dist/resolveNodeRef.js';
import { collectTextNodeFonts } from '../dist/fonts/collectDocumentFonts.js';
import { resolveRenderingFontName, getFontAvailability } from '../dist/fonts/fontSubstitution.js';
import { getFontFaceCss } from '../dist/fonts/localFontRegistry.js';
import { collectRenderingFonts } from '../dist/fonts/fontSubstitution.js';

const path = process.argv[2];
const figmaId = process.argv[3];
const envelope = JSON.parse(readFileSync(path, 'utf8'));
const rootId = resolveHfcNodeIdBySourceFigmaId(envelope, figmaId);
if (!rootId) {
  console.error('Node not found:', figmaId);
  process.exit(1);
}

function findNode(node, id) {
  if (node.id === id) return node;
  if (node.children) {
    for (const c of node.children) {
      const hit = findNode(c, id);
      if (hit) return hit;
    }
  }
  return null;
}

const root = findNode(envelope.document, rootId);
if (!root) {
  console.error('HFC node missing:', rootId);
  process.exit(1);
}

const texts = [];
function walk(n) {
  if (n.type === 'TEXT') texts.push(n);
  if (n.children) for (const c of n.children) walk(c);
}
walk(root);

const fontSet = new Map();
for (const t of texts) {
  for (const fn of collectTextNodeFonts(t)) {
    const key = `${fn.family}\0${fn.style}`;
    if (!fontSet.has(key)) {
      fontSet.set(key, {
        requested: fn,
        rendering: resolveRenderingFontName(fn),
        substituted: fn.family !== resolveRenderingFontName(fn).family || fn.style !== resolveRenderingFontName(fn).style,
      });
    }
  }
}

console.log(JSON.stringify({
  figmaId,
  hfcId: rootId,
  name: root.name,
  textNodeCount: texts.length,
  fonts: [...fontSet.values()],
}, null, 2));

const miniEnv = {
  schemaVersion: 1,
  fileKey: envelope.fileKey,
  fileName: envelope.fileName,
  nextInternalId: envelope.nextInternalId,
  document: {
    ...envelope.document,
    children: envelope.document.children.map((page) => ({
      ...page,
      children: [root],
    })),
  },
};

const faces = collectRenderingFonts(miniEnv);
const css = getFontFaceCss('http://127.0.0.1:3847/fonts/', faces);
console.log('\n--- @font-face families in CSS ---');
for (const m of css.matchAll(/font-family:"([^"]+)"/g)) console.log(m[1]);
console.log('\n--- woff2 URLs ---');
for (const m of css.matchAll(/url\("([^"]+)"\)/g)) console.log(m[1]);
