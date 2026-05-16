#!/usr/bin/env node
/**
 * One-shot generator for verification scenarios. Run from package root:
 *   node verification/scripts/generate-scenarios.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCENARIOS_DIR = join(ROOT, 'scenarios');

const MINIMAL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

function pngLiteral() {
  return `[${[...MINIMAL_PNG].join(',')}]`;
}

/** @type {Array<{id:string,title:string,order:number,tier:'foundational'|'advanced',tags:string[],description:string,body:string,needsFont?:boolean}>} */
const SCENARIOS = [
  {
    id: '01-solid-fill-rectangle',
    title: 'Solid fill rectangle',
    order: 1,
    tier: 'foundational',
    tags: ['fills', 'shapes'],
    description:
      'Tests a single RECTANGLE with a solid red fill.\n\nExpected: one red rectangle centered on a light gray artboard.',
    body: `
const rect = figma.createRectangle();
rect.resize(200, 120);
rect.x = 140;
rect.y = 120;
rect.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
root.appendChild(rect);
`,
  },
  {
    id: '02-solid-stroke-rectangle',
    title: 'Solid stroke rectangle',
    order: 2,
    tier: 'foundational',
    tags: ['strokes'],
    description:
      'Tests stroke with no fill.\n\nExpected: hollow rectangle with 4px black border.',
    body: `
const rect = figma.createRectangle();
rect.resize(200, 120);
rect.x = 140;
rect.y = 120;
rect.fills = [];
rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
rect.strokeWeight = 4;
root.appendChild(rect);
`,
  },
  {
    id: '03-frame-background-clip',
    title: 'Frame background and clip',
    order: 3,
    tier: 'foundational',
    tags: ['frame', 'clip'],
    description:
      'Tests clipsContent on ScenarioRoot with overflowing child.\n\nExpected: child clipped at artboard edges.',
    body: `
root.clipsContent = true;
root.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.95 } }];
const child = figma.createRectangle();
child.resize(300, 200);
child.x = 350;
child.y = 280;
child.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.9 } }];
root.appendChild(child);
`,
  },
  {
    id: '04-basic-text',
    title: 'Basic text',
    order: 4,
    tier: 'foundational',
    tags: ['text'],
    needsFont: true,
    description:
      'Single-style TEXT node.\n\nExpected: "Hello Figma" in Inter 16px, dark gray.',
    body: `
const text = figma.createText();
text.characters = 'Hello Figma';
text.fontSize = 16;
text.x = 160;
text.y = 170;
text.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2 } }];
root.appendChild(text);
`,
  },
  {
    id: '05-styled-text-segments',
    title: 'Styled text segments',
    order: 5,
    tier: 'foundational',
    tags: ['text', 'styledSegments'],
    needsFont: true,
    description:
      'Mixed text ranges via setRangeFontSize, setRangeFills, and setRangeHyperlink.\n\nExpected: two-tone text with underlined link span.',
    body: `
const text = figma.createText();
text.characters = 'Big red link';
text.fontSize = 14;
text.x = 120;
text.y = 160;
text.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.25 } }];
text.setRangeFontSize(0, 3, 24);
text.setRangeFills(0, 3, [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]);
text.setRangeFills(4, 7, [{ type: 'SOLID', color: { r: 0.9, g: 0.1, b: 0.1 } }]);
text.setRangeHyperlink(8, 12, { type: 'URL', value: 'https://example.com' });
root.appendChild(text);
`,
  },
  {
    id: '06-ellipse-solid',
    title: 'Ellipse solid fill',
    order: 6,
    tier: 'foundational',
    tags: ['shapes'],
    description: 'ELLIPSE with green fill.\n\nExpected: green oval centered on artboard.',
    body: `
const el = figma.createEllipse();
el.resize(180, 120);
el.x = 150;
el.y = 120;
el.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
root.appendChild(el);
`,
  },
  {
    id: '07-line-stroke',
    title: 'Line stroke',
    order: 7,
    tier: 'foundational',
    tags: ['line'],
    description: 'LINE with round caps.\n\nExpected: diagonal blue line across the artboard.',
    body: `
const line = figma.createLine();
line.resize(280, 0);
line.x = 100;
line.y = 180;
line.rotation = 15;
line.strokes = [{ type: 'SOLID', color: { r: 0.1, g: 0.4, b: 0.9 } }];
line.strokeWeight = 6;
line.strokeCap = 'ROUND';
root.appendChild(line);
`,
  },
  {
    id: '08-opacity',
    title: 'Opacity',
    order: 8,
    tier: 'foundational',
    tags: ['opacity'],
    description:
      'Semi-transparent rect over opaque background.\n\nExpected: blended purple over blue background.',
    body: `
const bg = figma.createRectangle();
bg.resize(480, 360);
bg.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9 } }];
root.appendChild(bg);
const fg = figma.createRectangle();
fg.resize(200, 140);
fg.x = 140;
fg.y = 110;
fg.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.2, b: 0.8 } }];
fg.opacity = 0.5;
root.appendChild(fg);
`,
  },
  {
    id: '09-rotation',
    title: 'Rotation',
    order: 9,
    tier: 'foundational',
    tags: ['rotation'],
    description: 'Rectangle rotated 45 degrees.\n\nExpected: diamond-oriented orange square.',
    body: `
const rect = figma.createRectangle();
rect.resize(120, 120);
rect.x = 180;
rect.y = 120;
rect.rotation = 45;
rect.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.55, b: 0.1 } }];
root.appendChild(rect);
`,
  },
  {
    id: '10-blend-mode',
    title: 'Blend mode multiply',
    order: 10,
    tier: 'foundational',
    tags: ['blendMode'],
    description:
      'Two overlapping rects; top uses MULTIPLY.\n\nExpected: darker overlap region vs simple alpha.',
    body: `
const a = figma.createRectangle();
a.resize(200, 160);
a.x = 120;
a.y = 100;
a.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.3 } }];
root.appendChild(a);
const b = figma.createRectangle();
b.resize(200, 160);
b.x = 200;
b.y = 140;
b.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
b.blendMode = 'MULTIPLY';
root.appendChild(b);
`,
  },
  {
    id: '11-linear-gradient',
    title: 'Linear gradient',
    order: 11,
    tier: 'foundational',
    tags: ['gradient'],
    description: 'GRADIENT_LINEAR fill left-to-right.\n\nExpected: blue-to-orange horizontal gradient rect.',
    body: `
const rect = figma.createRectangle();
rect.resize(320, 180);
rect.x = 80;
rect.y = 90;
rect.fills = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 0.1, g: 0.3, b: 0.9, a: 1 } },
    { position: 1, color: { r: 0.95, g: 0.5, b: 0.1, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
root.appendChild(rect);
`,
  },
  {
    id: '12-radial-gradient',
    title: 'Radial gradient',
    order: 12,
    tier: 'foundational',
    tags: ['gradient'],
    description: 'GRADIENT_RADIAL fill.\n\nExpected: radial glow centered in rectangle.',
    body: `
const rect = figma.createRectangle();
rect.resize(280, 200);
rect.x = 100;
rect.y = 80;
rect.fills = [{
  type: 'GRADIENT_RADIAL',
  gradientStops: [
    { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
    { position: 1, color: { r: 0.2, g: 0.1, b: 0.6, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0.5], [0, 1, 0.5]],
}];
root.appendChild(rect);
`,
  },
  {
    id: '13-image-fill',
    title: 'Image fill',
    order: 13,
    tier: 'foundational',
    tags: ['image'],
    description: 'createImage + IMAGE paint.\n\nExpected: small PNG pattern visible in rectangle.',
    body: `
const img = figma.createImage(new Uint8Array(${pngLiteral()}));
const rect = figma.createRectangle();
rect.resize(200, 200);
rect.x = 140;
rect.y = 80;
rect.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
root.appendChild(rect);
`,
  },
  {
    id: '14-polygon',
    title: 'Polygon',
    order: 14,
    tier: 'foundational',
    tags: ['polygon'],
    description: 'Hexagon POLYGON.\n\nExpected: six-sided purple shape.',
    body: `
const poly = figma.createPolygon();
poly.pointCount = 6;
poly.resize(160, 160);
poly.x = 160;
poly.y = 100;
poly.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.2, b: 0.8 } }];
root.appendChild(poly);
`,
  },
  {
    id: '15-star',
    title: 'Star',
    order: 15,
    tier: 'foundational',
    tags: ['star'],
    description: 'STAR with innerRadius.\n\nExpected: five-point gold star.',
    body: `
const star = figma.createStar();
star.pointCount = 5;
star.innerRadius = 0.4;
star.resize(140, 140);
star.x = 170;
star.y = 110;
star.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.8, b: 0.1 } }];
root.appendChild(star);
`,
  },
  {
    id: '16-dashed-stroke',
    title: 'Dashed stroke',
    order: 16,
    tier: 'foundational',
    tags: ['stroke'],
    description: 'dashPattern on stroked rect.\n\nExpected: dashed border rectangle.',
    body: `
const rect = figma.createRectangle();
rect.resize(240, 140);
rect.x = 120;
rect.y = 110;
rect.fills = [];
rect.strokes = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
rect.strokeWeight = 3;
rect.dashPattern = [8, 6];
root.appendChild(rect);
`,
  },
  {
    id: '17-stroke-align',
    title: 'Stroke align inside',
    order: 17,
    tier: 'foundational',
    tags: ['stroke'],
    description: 'strokeAlign INSIDE.\n\nExpected: stroke drawn inside fill bounds.',
    body: `
const rect = figma.createRectangle();
rect.resize(200, 120);
rect.x = 140;
rect.y = 120;
rect.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.9, b: 0.95 } }];
rect.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
rect.strokeWeight = 8;
rect.strokeAlign = 'INSIDE';
root.appendChild(rect);
`,
  },
  {
    id: '18-corner-radius',
    title: 'Corner radius',
    order: 18,
    tier: 'foundational',
    tags: ['cornerRadius'],
    description: 'Uniform cornerRadius.\n\nExpected: rounded rectangle.',
    body: `
const rect = figma.createRectangle();
rect.resize(220, 100);
rect.x = 130;
rect.y = 130;
rect.cornerRadius = 24;
rect.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.55, b: 0.95 } }];
root.appendChild(rect);
`,
  },
  {
    id: '19-multi-fill',
    title: 'Multi fill stack',
    order: 19,
    tier: 'foundational',
    tags: ['fills'],
    description:
      'Solid + gradient fills stacked.\n\nExpected: gradient with solid tint overlay (top fill semi-transparent).',
    body: `
const rect = figma.createRectangle();
rect.resize(300, 180);
rect.x = 90;
rect.y = 90;
rect.fills = [
  { type: 'SOLID', color: { r: 0.2, g: 0.3, b: 0.8 } },
  {
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { r: 1, g: 1, b: 1, a: 0.6 } },
      { position: 1, color: { r: 0, g: 0, b: 0, a: 0.2 } },
    ],
    gradientTransform: [[0, 1, 0], [1, 0, 0]],
  },
];
root.appendChild(rect);
`,
  },
  {
    id: '20-pattern-fill',
    title: 'Pattern fill',
    order: 20,
    tier: 'foundational',
    tags: ['pattern'],
    description:
      'PATTERN fill (may be simplified in clone).\n\nExpected: repeating tile or documented approximation.',
    body: `
const tile = figma.createEllipse();
tile.resize(16, 16);
tile.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.95 } }];
tile.x = -200;
tile.y = -200;
figma.currentPage.appendChild(tile);
const rect = figma.createRectangle();
rect.resize(280, 180);
rect.x = 100;
rect.y = 90;
root.appendChild(rect);
await rect.setFillsAsync([
  {
    type: 'PATTERN',
    sourceNodeId: tile.id,
    tileType: 'RECTANGULAR',
    scalingFactor: 1,
    spacing: { x: 0.5, y: 0.5 },
    horizontalAlignment: 'START',
    verticalAlignment: 'START',
  },
]);
`,
  },
  {
    id: '21-autolayout-horizontal',
    title: 'Auto layout horizontal',
    order: 21,
    tier: 'foundational',
    tags: ['autolayout'],
    description: 'Horizontal auto layout with 3 children.\n\nExpected: row of colored pills with gap.',
    body: `
const row = figma.createAutoLayout();
row.resize(360, 56);
row.x = 60;
row.y = 150;
row.itemSpacing = 12;
row.paddingLeft = 12;
row.paddingRight = 12;
row.paddingTop = 8;
row.paddingBottom = 8;
const colors = [
  { r: 0.9, g: 0.2, b: 0.2 },
  { r: 0.2, g: 0.7, b: 0.3 },
  { r: 0.2, g: 0.4, b: 0.9 },
];
for (let i = 0; i < 3; i++) {
  const pill = figma.createRectangle();
  pill.resize(80, 32);
  pill.fills = [{ type: 'SOLID', color: colors[i] }];
  row.appendChild(pill);
}
root.appendChild(row);
`,
  },
  {
    id: '22-autolayout-vertical',
    title: 'Auto layout vertical',
    order: 22,
    tier: 'foundational',
    tags: ['autolayout'],
    description: 'Vertical stack with center alignment.\n\nExpected: centered column of blocks.',
    body: `
const col = figma.createFrame();
col.layoutMode = 'VERTICAL';
col.counterAxisAlignItems = 'CENTER';
col.itemSpacing = 10;
col.resize(200, 200);
col.x = 140;
col.y = 80;
col.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
col.paddingTop = 16;
col.paddingBottom = 16;
for (let i = 0; i < 3; i++) {
  const box = figma.createRectangle();
  box.resize(120, 36);
  box.fills = [{ type: 'SOLID', color: { r: 0.3 + i * 0.2, g: 0.4, b: 0.8 } }];
  col.appendChild(box);
}
root.appendChild(col);
`,
  },
  {
    id: '23-layout-sizing-fill-hug',
    title: 'Layout sizing FILL vs HUG',
    order: 23,
    tier: 'foundational',
    tags: ['autolayout', 'layoutSizing'],
    description:
      'FILL sibling beside a fixed-width bar (HUG on shapes is text-only in Desktop; fixed width matches the narrow bar).\n\nExpected: green bar expands, orange stays narrow.',
    body: `
const row = figma.createAutoLayout();
row.resize(360, 48);
row.x = 60;
row.y = 156;
row.itemSpacing = 8;
const fill = figma.createRectangle();
fill.name = 'Fill';
fill.resize(80, 40);
fill.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
const narrow = figma.createRectangle();
narrow.name = 'Narrow';
narrow.resize(50, 40);
narrow.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.55, b: 0.1 } }];
root.appendChild(row);
row.appendChild(fill);
fill.layoutSizingHorizontal = 'FILL';
row.appendChild(narrow);
`,
  },
  {
    id: '24-autolayout-wrap',
    title: 'Auto layout wrap',
    order: 24,
    tier: 'foundational',
    tags: ['autolayout', 'wrap'],
    description: 'layoutWrap with many chips.\n\nExpected: chips wrap to second row.',
    body: `
const row = figma.createAutoLayout();
row.resize(320, 120);
row.x = 80;
row.y = 120;
row.layoutWrap = 'WRAP';
row.itemSpacing = 8;
row.counterAxisSpacing = 8;
for (let i = 0; i < 8; i++) {
  const chip = figma.createRectangle();
  chip.resize(64, 28);
  chip.fills = [{ type: 'SOLID', color: { r: 0.2 + (i % 3) * 0.25, g: 0.5, b: 0.85 } }];
  row.appendChild(chip);
}
root.appendChild(row);
`,
  },
  {
    id: '25-absolute-positioning',
    title: 'Absolute positioning',
    order: 25,
    tier: 'foundational',
    tags: ['autolayout', 'absolute'],
    description: 'ABSOLUTE child in auto-layout frame.\n\nExpected: badge floats over row items.',
    body: `
const row = figma.createAutoLayout();
row.resize(300, 80);
row.x = 90;
row.y = 140;
const a = figma.createRectangle();
a.resize(60, 40);
a.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
row.appendChild(a);
const badge = figma.createEllipse();
badge.resize(32, 32);
badge.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.2, b: 0.2 } }];
row.appendChild(badge);
badge.layoutPositioning = 'ABSOLUTE';
badge.x = 250;
badge.y = 8;
root.appendChild(row);
`,
  },
  {
    id: '26-constraints',
    title: 'Constraints stretch',
    order: 26,
    tier: 'foundational',
    tags: ['constraints'],
    description: 'Child with left+right constraints.\n\nExpected: bar stretches full width of parent.',
    body: `
const parent = figma.createFrame();
parent.resize(360, 100);
parent.x = 60;
parent.y = 130;
parent.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.91, b: 0.94 } }];
const child = figma.createRectangle();
child.resize(100, 40);
child.y = 30;
child.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
child.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
parent.appendChild(child);
root.appendChild(parent);
`,
  },
  {
    id: '27-layout-grid',
    title: 'Layout grid',
    order: 27,
    tier: 'foundational',
    tags: ['layoutGrids'],
    description:
      'Column layout grid on frame (editor guide only).\n\nExpected: plain frame fill only; layout grids are not painted in Figma PNG export.',
    body: `
const frame = figma.createFrame();
frame.resize(400, 240);
frame.x = 40;
frame.y = 60;
frame.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.97, b: 0.99 } }];
frame.layoutGrids = [
  {
    pattern: 'COLUMNS',
    alignment: 'MIN',
    sectionSize: 80,
    gutterSize: 16,
    count: 4,
    offset: 16,
    color: { r: 0, g: 0.3, b: 0.8, a: 0.15 },
  },
];
root.appendChild(frame);
`,
  },
  {
    id: '28-min-max-size',
    title: 'Min max size',
    order: 28,
    tier: 'foundational',
    tags: ['autolayout', 'minMax'],
    description: 'Auto-layout child with min/max width.\n\nExpected: child clamped between min and max.',
    body: `
const row = figma.createAutoLayout();
row.resize(400, 56);
row.x = 40;
row.y = 150;
const child = figma.createRectangle();
child.resize(200, 40);
child.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.3, b: 0.85 } }];
root.appendChild(row);
row.appendChild(child);
child.minWidth = 80;
child.maxWidth = 160;
child.layoutSizingHorizontal = 'FILL';
`,
  },
  {
    id: '29-group',
    title: 'Group',
    order: 29,
    tier: 'foundational',
    tags: ['group'],
    description: 'figma.group over shapes.\n\nExpected: grouped shapes move as unit (visually offset stack).',
    body: `
const a = figma.createRectangle();
a.resize(80, 80);
a.x = 140;
a.y = 120;
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.2 } }];
root.appendChild(a);
const b = figma.createRectangle();
b.resize(80, 80);
b.x = 180;
b.y = 150;
b.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.9 } }];
root.appendChild(b);
const g = figma.group([a, b], root);
g.x = 20;
`,
  },
  {
    id: '30-section',
    title: 'Section',
    order: 30,
    tier: 'foundational',
    tags: ['section'],
    description: 'SECTION containing frames.\n\nExpected: section bounds around nested frames.',
    body: `
const section = figma.createSection();
section.resize(400, 200);
section.x = 40;
section.y = 80;
section.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.95, a: 0.5 } }];
const inner = figma.createFrame();
inner.resize(160, 80);
inner.x = 20;
inner.y = 40;
inner.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
section.appendChild(inner);
root.appendChild(section);
`,
  },
  {
    id: '31-drop-shadow',
    title: 'Drop shadow',
    order: 31,
    tier: 'foundational',
    tags: ['effects'],
    description: 'DROP_SHADOW on card.\n\nExpected: soft shadow below white card.',
    body: `
const card = figma.createRectangle();
card.resize(220, 120);
card.x = 130;
card.y = 110;
card.cornerRadius = 12;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.effects = [{
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  offset: { x: 0, y: 8 },
  radius: 16,
  spread: 0,
  blendMode: 'NORMAL',
  visible: true,
}];
root.appendChild(card);
`,
  },
  {
    id: '32-backdrop-blur',
    title: 'Backdrop blur',
    order: 32,
    tier: 'foundational',
    tags: ['effects', 'blur'],
    description: 'BACKGROUND_BLUR panel over colorful bg.\n\nExpected: frosted glass panel blurring stripes behind.',
    body: `
for (let i = 0; i < 5; i++) {
  const stripe = figma.createRectangle();
  stripe.resize(480, 40);
  stripe.y = i * 72;
  stripe.fills = [{ type: 'SOLID', color: { r: (i % 2) * 0.8, g: 0.2 + i * 0.15, b: 0.6 } }];
  root.appendChild(stripe);
}
const panel = figma.createFrame();
panel.resize(280, 140);
panel.x = 100;
panel.y = 110;
panel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.35 } }];
panel.effects = [{ type: 'BACKGROUND_BLUR', radius: 12, visible: true }];
root.appendChild(panel);
`,
  },
  {
    id: '33-mask',
    title: 'Mask',
    order: 33,
    tier: 'foundational',
    tags: ['mask'],
    description: 'isMask circle masks gradient rect.\n\nExpected: gradient visible only inside circle.',
    body: `
const content = figma.createRectangle();
content.resize(240, 160);
content.x = 120;
content.y = 100;
content.fills = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 0.2, g: 0.5, b: 1, a: 1 } },
    { position: 1, color: { r: 0.9, g: 0.2, b: 0.5, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
root.appendChild(content);
const mask = figma.createEllipse();
mask.resize(160, 160);
mask.x = 160;
mask.y = 100;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
mask.isMask = true;
root.appendChild(mask);
`,
  },
  {
    id: '34-clip-content',
    title: 'Clip content',
    order: 34,
    tier: 'foundational',
    tags: ['clip', 'rotation'],
    description: 'clipsContent with rotated overflow.\n\nExpected: rotated rect clipped by parent.',
    body: `
const parent = figma.createFrame();
parent.resize(240, 180);
parent.x = 120;
parent.y = 90;
parent.clipsContent = true;
parent.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
const child = figma.createRectangle();
child.resize(200, 80);
child.x = 40;
child.y = 60;
child.rotation = 25;
child.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.4, b: 0.1 } }];
parent.appendChild(child);
root.appendChild(parent);
`,
  },
  {
    id: '35-vector-path',
    title: 'Vector path',
    order: 35,
    tier: 'foundational',
    tags: ['vector'],
    description: 'VECTOR with simple path.\n\nExpected: triangular vector stroke/fill icon.',
    body: `
const vec = figma.createVector();
vec.resize(120, 100);
vec.x = 180;
vec.y = 130;
vec.vectorPaths = [{
  windingRule: 'NONZERO',
  data: 'M 60 10 L 110 90 L 10 90 Z',
}];
vec.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.65, b: 0.4 } }];
root.appendChild(vec);
`,
  },
  {
    id: '36-boolean-union',
    title: 'Boolean union',
    order: 36,
    tier: 'foundational',
    tags: ['boolean'],
    description: 'figma.union on circle and square.\n\nExpected: merged silhouette.',
    body: `
const sq = figma.createRectangle();
sq.resize(100, 100);
sq.x = 140;
sq.y = 130;
sq.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
root.appendChild(sq);
const circ = figma.createEllipse();
circ.resize(100, 100);
circ.x = 200;
circ.y = 130;
circ.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
root.appendChild(circ);
const u = figma.union([sq, circ], root);
u.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.85 } }];
`,
  },
  {
    id: '37-boolean-subtract',
    title: 'Boolean subtract',
    order: 37,
    tier: 'foundational',
    tags: ['boolean'],
    description: 'figma.subtract hole in rect.\n\nExpected: rectangle with circular hole.',
    body: `
const base = figma.createRectangle();
base.resize(200, 140);
base.x = 140;
base.y = 110;
base.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.9 } }];
root.appendChild(base);
const hole = figma.createEllipse();
hole.resize(80, 80);
hole.x = 200;
hole.y = 140;
hole.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(hole);
figma.subtract([base, hole], root);
`,
  },
  {
    id: '38-transform-group',
    title: 'Transform group',
    order: 38,
    tier: 'foundational',
    tags: ['transformGroup'],
    description: 'transformGroup with rotation.\n\nExpected: grouped shapes rotated together.',
    body: `
const a = figma.createRectangle();
a.resize(60, 60);
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
root.appendChild(a);
const b = figma.createRectangle();
b.resize(60, 60);
b.x = 40;
b.y = 40;
b.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.7, b: 0.3 } }];
root.appendChild(b);
const tg = figma.transformGroup([a, b], root, 0, []);
tg.x = 180;
tg.y = 120;
tg.rotation = 20;
`,
  },
  {
    id: '39-text-on-path',
    title: 'Text on path',
    order: 39,
    tier: 'foundational',
    tags: ['textOnPath'],
    needsFont: true,
    description: 'Text along a curved path.\n\nExpected: characters follow arc path.',
    body: `
const path = figma.createVector();
path.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 80 200 Q 240 80 400 200' }];
path.x = 40;
path.y = 80;
root.appendChild(path);
const text = figma.createTextPath(path, 0, 0);
text.characters = 'Curved label';
text.fontSize = 14;
text.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.2 } }];
if (text !== path) root.appendChild(text);
`,
  },
  {
    id: '40-arc-ellipse',
    title: 'Arc ellipse',
    order: 40,
    tier: 'foundational',
    tags: ['arc', 'ellipse'],
    description:
      'ELLIPSE with arcData for a partial ring.\n\nExpected: donut-style arc segment (not a full oval).',
    body: `
const arc = figma.createEllipse();
arc.resize(200, 200);
arc.x = 140;
arc.y = 80;
arc.arcData = { startingAngle: 0, endingAngle: Math.PI * 1.25, innerRadius: 0.55 };
arc.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.55, b: 0.95 } }];
root.appendChild(arc);
`,
  },
  {
    id: '41-color-variable',
    title: 'Color variable',
    order: 41,
    tier: 'foundational',
    tags: ['variables'],
    description: 'COLOR variable bound to fill.\n\nExpected: rectangle uses token red from variable.',
    body: `
const col = figma.variables.createVariableCollection('Brand');
const modeId = col.modes[0].modeId;
const brand = figma.variables.createVariable('primary', col, 'COLOR');
brand.setValueForMode(modeId, { r: 0.9, g: 0.15, b: 0.2 });
const rect = figma.createRectangle();
rect.resize(200, 100);
rect.x = 140;
rect.y = 130;
root.appendChild(rect);
rect.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', brand)];
`,
  },
  {
    id: '42-float-variable-spacing',
    title: 'Float variable spacing',
    order: 42,
    tier: 'foundational',
    tags: ['variables', 'autolayout'],
    description: 'FLOAT variable on itemSpacing.\n\nExpected: wide gap between row items.',
    body: `
const col = figma.variables.createVariableCollection('Layout');
const modeId = col.modes[0].modeId;
const gap = figma.variables.createVariable('gap', col, 'FLOAT');
gap.setValueForMode(modeId, 32);
const row = figma.createAutoLayout();
row.resize(320, 48);
row.x = 80;
row.y = 156;
for (let i = 0; i < 2; i++) {
  const box = figma.createRectangle();
  box.resize(80, 36);
  box.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.85 } }];
  row.appendChild(box);
}
root.appendChild(row);
row.setBoundVariable('itemSpacing', gap);
`,
  },
  {
    id: '43-local-styles',
    title: 'Local styles',
    order: 43,
    tier: 'foundational',
    tags: ['styles'],
    needsFont: true,
    description: 'Paint and text styles applied.\n\nExpected: styled heading with paint style fill.',
    body: `
const paintStyle = figma.createPaintStyle();
paintStyle.name = 'BrandFill';
paintStyle.paints = [{ type: 'SOLID', color: { r: 0.1, g: 0.45, b: 0.85 } }];
const textStyle = figma.createTextStyle();
textStyle.name = 'Heading';
textStyle.fontSize = 24;
const rect = figma.createRectangle();
rect.resize(280, 80);
rect.x = 100;
rect.y = 140;
root.appendChild(rect);
await rect.setFillStyleIdAsync(paintStyle.id);
const text = figma.createText();
text.characters = 'Styled';
text.x = 200;
text.y = 160;
root.appendChild(text);
await text.setTextStyleIdAsync(textStyle.id);
`,
  },
  {
    id: '44-component-instance',
    title: 'Component instance',
    order: 44,
    tier: 'foundational',
    tags: ['components'],
    needsFont: true,
    description: 'Component + instance.\n\nExpected: button component rendered as instance.',
    body: `
const frame = figma.createFrame();
frame.resize(120, 40);
frame.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
const label = figma.createText();
label.characters = 'Button';
label.fontSize = 14;
label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
frame.appendChild(label);
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);
const inst = comp.createInstance();
inst.x = 180;
inst.y = 160;
root.appendChild(inst);
`,
  },
  {
    id: '45-component-variants',
    title: 'Component variants',
    order: 45,
    tier: 'foundational',
    tags: ['components', 'variants'],
    needsFont: true,
    description: 'combineAsVariants with two frames.\n\nExpected: component set with variant property.',
    body: `
const fA = figma.createFrame();
fA.resize(100, 40);
fA.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.3 } }];
figma.currentPage.appendChild(fA);
const cA = figma.createComponentFromNode(fA);
const fB = figma.createFrame();
fB.resize(100, 40);
fB.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.2 } }];
figma.currentPage.appendChild(fB);
const cB = figma.createComponentFromNode(fB);
const set = figma.combineAsVariants([cA, cB], figma.currentPage);
const inst = set.defaultVariant.createInstance();
inst.x = 190;
inst.y = 160;
root.appendChild(inst);
`,
  },
  {
    id: '46-swap-component',
    title: 'Swap component',
    order: 46,
    tier: 'foundational',
    tags: ['components'],
    needsFont: true,
    description: 'Instance swapComponent to alternate.\n\nExpected: instance shows second variant after swap.',
    body: `
const fA = figma.createFrame();
fA.resize(100, 40);
fA.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
figma.currentPage.appendChild(fA);
const cA = figma.createComponentFromNode(fA);
const fB = figma.createFrame();
fB.resize(100, 40);
fB.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.5, b: 0.1 } }];
figma.currentPage.appendChild(fB);
const cB = figma.createComponentFromNode(fB);
const set = figma.combineAsVariants([cA, cB], figma.currentPage);
const inst = set.defaultVariant.createInstance();
inst.x = 190;
inst.y = 160;
root.appendChild(inst);
inst.swapComponent(cB);
`,
  },
  {
    id: '47-detach-instance',
    title: 'Detach instance',
    order: 47,
    tier: 'foundational',
    tags: ['components'],
    needsFont: true,
    description: 'detachInstance breaks link.\n\nExpected: editable frame group where instance was.',
    body: `
const frame = figma.createFrame();
frame.resize(100, 40);
frame.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.3, b: 0.85 } }];
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);
const inst = comp.createInstance();
inst.x = 190;
inst.y = 160;
root.appendChild(inst);
inst.detachInstance();
`,
  },
  {
    id: '48-nav-bar-composite',
    title: 'Nav bar composite',
    order: 48,
    tier: 'foundational',
    tags: ['composite', 'autolayout'],
    needsFont: true,
    description: 'Nav bar: logo + links + CTA.\n\nExpected: horizontal nav with brand block and button.',
    body: `
const nav = figma.createAutoLayout();
nav.resize(440, 52);
nav.x = 20;
nav.y = 20;
nav.paddingLeft = 16;
nav.paddingRight = 16;
nav.itemSpacing = 16;
nav.counterAxisAlignItems = 'CENTER';
nav.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
const logo = figma.createRectangle();
logo.resize(32, 32);
logo.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
nav.appendChild(logo);
const links = figma.createText();
links.characters = 'Home  About  Contact';
links.fontSize = 14;
nav.appendChild(links);
const cta = figma.createRectangle();
cta.resize(72, 32);
cta.cornerRadius = 6;
cta.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
nav.appendChild(cta);
root.appendChild(nav);
`,
  },
  {
    id: '49-card-dashboard',
    title: 'Card dashboard',
    order: 49,
    tier: 'foundational',
    tags: ['composite', 'effects'],
    description: 'Card with gradient, shadow, blur panel.\n\nExpected: dashboard card with frosted overlay.',
    body: `
const card = figma.createFrame();
card.resize(320, 200);
card.x = 80;
card.y = 80;
card.cornerRadius = 16;
card.fills = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 0.15, g: 0.35, b: 0.85, a: 1 } },
    { position: 1, color: { r: 0.4, g: 0.2, b: 0.7, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
card.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 6 }, radius: 20, blendMode: 'NORMAL', visible: true }];
const panel = figma.createFrame();
panel.resize(200, 80);
panel.x = 60;
panel.y = 60;
panel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.3 } }];
panel.effects = [{ type: 'BACKGROUND_BLUR', radius: 10, visible: true }];
card.appendChild(panel);
root.appendChild(card);
`,
  },
  {
    id: '50-full-showcase',
    title: 'Full showcase',
    order: 50,
    tier: 'foundational',
    tags: ['composite'],
    needsFont: true,
    description:
      'Phase 4–5 style combo: grid, mask, boolean, vector.\n\nExpected: mini UI with nav pills, masked panel, boolean cutout.',
    body: `
root.layoutGrids = [
  {
    pattern: 'COLUMNS',
    alignment: 'MIN',
    sectionSize: 60,
    gutterSize: 12,
    count: Infinity,
    offset: 0,
    color: { r: 0, g: 0.3, b: 0.8, a: 0.12 },
  },
];
const nav = figma.createAutoLayout();
nav.resize(400, 40);
nav.x = 40;
nav.y = 16;
nav.itemSpacing = 8;
for (let i = 0; i < 3; i++) {
  const p = figma.createRectangle();
  p.resize(56, 24);
  p.fills = [{ type: 'SOLID', color: { r: 0.15 + i * 0.25, g: 0.45, b: 0.85 } }];
  nav.appendChild(p);
}
root.appendChild(nav);
const panel = figma.createRectangle();
panel.resize(200, 120);
panel.x = 140;
panel.y = 80;
panel.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.3, g: 0.6, b: 1, a: 1 } }, { position: 1, color: { r: 0.8, g: 0.2, b: 0.5, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(panel);
const mask = figma.createEllipse();
mask.resize(120, 120);
mask.x = 180;
mask.y = 90;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
`,
  },
  {
    id: '51-nested-frames',
    title: 'Nested frames',
    order: 51,
    tier: 'advanced',
    tags: ['nesting', 'frames'],
    description: '3-level nested frames with distinct fills.\n\nExpected: nested colored borders visible.',
    body: `
const l1 = figma.createFrame();
l1.resize(360, 260);
l1.x = 60;
l1.y = 50;
l1.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.9, b: 0.95 } }];
const l2 = figma.createFrame();
l2.resize(280, 180);
l2.x = 40;
l2.y = 40;
l2.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.8, b: 0.95 } }];
const l3 = figma.createFrame();
l3.resize(160, 80);
l3.x = 60;
l3.y = 50;
l3.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
l2.appendChild(l3);
l1.appendChild(l2);
root.appendChild(l1);
`,
  },
  {
    id: '52-sibling-paint-order',
    title: 'Sibling paint order',
    order: 52,
    tier: 'advanced',
    tags: ['z-index', 'stacking'],
    description:
      '5 rects same position; last child on top.\n\nExpected: topmost color is purple (5th appended).',
    body: `
const colors = [
  { r: 0.9, g: 0.2, b: 0.2 },
  { r: 0.2, g: 0.75, b: 0.3 },
  { r: 0.2, g: 0.4, b: 0.9 },
  { r: 0.95, g: 0.75, b: 0.1 },
  { r: 0.5, g: 0.2, b: 0.8 },
];
for (const c of colors) {
  const r = figma.createRectangle();
  r.resize(160, 120);
  r.x = 160;
  r.y = 120;
  r.fills = [{ type: 'SOLID', color: c }];
  root.appendChild(r);
}
`,
  },
  {
    id: '53-partial-overlap-no-blend',
    title: 'Partial overlap no blend',
    order: 53,
    tier: 'advanced',
    tags: ['overlap'],
    description: '3 offset overlapping rects without blend.\n\nExpected: crisp occlusion, no blend darkening.',
    body: `
const positions = [[120, 100], [180, 130], [240, 100]];
const colors = [
  { r: 0.9, g: 0.3, b: 0.3 },
  { r: 0.3, g: 0.7, b: 0.9 },
  { r: 0.3, g: 0.85, b: 0.4 },
];
for (let i = 0; i < 3; i++) {
  const r = figma.createRectangle();
  r.resize(140, 100);
  r.x = positions[i][0];
  r.y = positions[i][1];
  r.fills = [{ type: 'SOLID', color: colors[i] }];
  root.appendChild(r);
}
`,
  },
  {
    id: '54-visible-false',
    title: 'Visible false',
    order: 54,
    tier: 'advanced',
    tags: ['visibility'],
    description: 'Middle layer hidden.\n\nExpected: green (bottom) visible through stack where red hidden.',
    body: `
const bottom = figma.createRectangle();
bottom.resize(200, 140);
bottom.x = 140;
bottom.y = 110;
bottom.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
root.appendChild(bottom);
const hidden = figma.createRectangle();
hidden.resize(200, 140);
hidden.x = 160;
hidden.y = 120;
hidden.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
hidden.visible = false;
root.appendChild(hidden);
const top = figma.createRectangle();
top.resize(120, 80);
top.x = 200;
top.y = 140;
top.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9 } }];
root.appendChild(top);
`,
  },
  {
    id: '55-individual-corner-radius',
    title: 'Individual corner radius',
    order: 55,
    tier: 'advanced',
    tags: ['cornerRadius'],
    description: 'Per-corner radii if supported.\n\nExpected: asymmetric rounded corners or uniform fallback.',
    body: `
const rect = figma.createRectangle();
rect.resize(220, 120);
rect.x = 130;
rect.y = 120;
rect.cornerRadius = 24;
rect.topLeftRadius = 40;
rect.topRightRadius = 8;
rect.bottomRightRadius = 40;
rect.bottomLeftRadius = 8;
rect.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.55, b: 0.95 } }];
root.appendChild(rect);
`,
  },
  {
    id: '56-no-fill-vs-transparent',
    title: 'No fill vs transparent',
    order: 56,
    tier: 'advanced',
    tags: ['fills'],
    description: 'Empty fills vs semi-transparent fill.\n\nExpected: left shows bg through; right shows tinted overlay.',
    body: `
const bg = figma.createRectangle();
bg.resize(480, 360);
bg.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.85 } }];
root.appendChild(bg);
const noFill = figma.createRectangle();
noFill.resize(180, 100);
noFill.x = 60;
noFill.y = 130;
noFill.fills = [];
noFill.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
noFill.strokeWeight = 2;
root.appendChild(noFill);
const semi = figma.createRectangle();
semi.resize(180, 100);
semi.x = 260;
semi.y = 130;
semi.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.4 } }];
root.appendChild(semi);
`,
  },
  {
    id: '57-zero-opacity-layer',
    title: 'Zero opacity layer',
    order: 57,
    tier: 'advanced',
    tags: ['opacity', 'autolayout'],
    description: 'Invisible layer still takes space in row.\n\nExpected: gap between visible boxes where invisible sits.',
    body: `
const row = figma.createAutoLayout();
row.resize(360, 48);
row.x = 60;
row.y = 156;
row.itemSpacing = 12;
const a = figma.createRectangle();
a.resize(80, 36);
a.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.9 } }];
const ghost = figma.createRectangle();
ghost.resize(80, 36);
ghost.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
ghost.opacity = 0;
const b = figma.createRectangle();
b.resize(80, 36);
b.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
row.appendChild(a);
row.appendChild(ghost);
row.appendChild(b);
root.appendChild(row);
`,
  },
  {
    id: '58-nested-groups',
    title: 'Nested groups',
    order: 58,
    tier: 'advanced',
    tags: ['group'],
    description: 'GROUP inside GROUP.\n\nExpected: nested offset shapes.',
    body: `
const a = figma.createRectangle();
a.resize(60, 60);
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.2 } }];
root.appendChild(a);
const b = figma.createRectangle();
b.resize(60, 60);
b.x = 30;
b.y = 30;
b.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.9 } }];
root.appendChild(b);
const g1 = figma.group([a], root);
g1.x = 100;
g1.y = 100;
const c = figma.createRectangle();
c.resize(40, 40);
c.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.8, b: 0.4 } }];
g1.appendChild(c);
const g2 = figma.group([g1, b], root);
g2.x = 40;
`,
  },
  {
    id: '59-slice-marker',
    title: 'Slice marker',
    order: 59,
    tier: 'advanced',
    tags: ['slice'],
    description: 'SLICE around export region.\n\nExpected: slice bounds overlay on content (may be subtle in screenshot).',
    body: `
const content = figma.createRectangle();
content.resize(200, 120);
content.x = 140;
content.y = 120;
content.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.55, b: 0.9 } }];
root.appendChild(content);
const slice = figma.createSlice();
slice.x = 130;
slice.y = 110;
slice.resize(220, 140);
root.appendChild(slice);
`,
  },
  {
    id: '60-empty-autolayout-min',
    title: 'Empty auto layout min',
    order: 60,
    tier: 'advanced',
    tags: ['autolayout'],
    description: 'Empty auto-layout with padding.\n\nExpected: minimum box showing padding only.',
    body: `
const row = figma.createAutoLayout();
row.x = 160;
row.y = 140;
row.paddingLeft = 24;
row.paddingRight = 24;
row.paddingTop = 16;
row.paddingBottom = 16;
row.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.96 } }];
row.strokes = [{ type: 'SOLID', color: { r: 0.6, g: 0.65, b: 0.75 } }];
row.strokeWeight = 1;
root.appendChild(row);
`,
  },
  {
    id: '61-thick-stroke-ellipse',
    title: 'Thick stroke ellipse',
    order: 61,
    tier: 'advanced',
    tags: ['stroke', 'ellipse'],
    description: 'Ellipse with thick stroke, no fill.\n\nExpected: ring shape.',
    body: `
const el = figma.createEllipse();
el.resize(180, 140);
el.x = 150;
el.y = 110;
el.fills = [];
el.strokes = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.85 } }];
el.strokeWeight = 12;
root.appendChild(el);
`,
  },
  {
    id: '62-gradient-stroke',
    title: 'Gradient stroke',
    order: 62,
    tier: 'advanced',
    tags: ['stroke', 'gradient'],
    description: 'Gradient on strokes array.\n\nExpected: rainbow border on rectangle.',
    body: `
const rect = figma.createRectangle();
rect.resize(240, 140);
rect.x = 120;
rect.y = 110;
rect.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.97, b: 0.99 } }];
rect.strokes = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 0.9, g: 0.2, b: 0.2, a: 1 } },
    { position: 1, color: { r: 0.2, g: 0.4, b: 0.9, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
rect.strokeWeight = 6;
root.appendChild(rect);
`,
  },
  {
    id: '63-stacked-fills-opacity',
    title: 'Stacked fills opacity',
    order: 63,
    tier: 'advanced',
    tags: ['fills'],
    description: 'Two fills; top has reduced alpha.\n\nExpected: blue base with white haze overlay.',
    body: `
const rect = figma.createRectangle();
rect.resize(280, 160);
rect.x = 100;
rect.y = 100;
rect.fills = [
  { type: 'SOLID', color: { r: 0.15, g: 0.35, b: 0.85 } },
  { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.45 } },
];
root.appendChild(rect);
`,
  },
  {
    id: '64-image-under-gradient',
    title: 'Image under gradient',
    order: 64,
    tier: 'advanced',
    tags: ['image', 'gradient'],
    description: 'Image fill with gradient overlay.\n\nExpected: photo tint with gradient veil.',
    body: `
const img = figma.createImage(new Uint8Array(${pngLiteral()}));
const rect = figma.createRectangle();
rect.resize(280, 180);
rect.x = 100;
rect.y = 90;
rect.fills = [
  { type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' },
  {
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { r: 0, g: 0, b: 0, a: 0 } },
      { position: 1, color: { r: 0.1, g: 0.2, b: 0.6, a: 0.7 } },
    ],
    gradientTransform: [[0, 1, 0], [1, 0, 0]],
  },
];
root.appendChild(rect);
`,
  },
  {
    id: '65-blend-screen-stack',
    title: 'Blend screen stack',
    order: 65,
    tier: 'advanced',
    tags: ['blendMode'],
    description: '3 layers; top SCREEN blend.\n\nExpected: lighter blend in overlap.',
    body: `
const colors = [{ r: 0.8, g: 0.2, b: 0.2 }, { r: 0.2, g: 0.7, b: 0.3 }, { r: 0.2, g: 0.3, b: 0.8 }];
for (let i = 0; i < 3; i++) {
  const r = figma.createRectangle();
  r.resize(180, 120);
  r.x = 120 + i * 40;
  r.y = 100 + i * 30;
  r.fills = [{ type: 'SOLID', color: colors[i] }];
  if (i === 2) r.blendMode = 'SCREEN';
  root.appendChild(r);
}
`,
  },
  {
    id: '66-blend-overlay-stack',
    title: 'Blend overlay stack',
    order: 66,
    tier: 'advanced',
    tags: ['blendMode'],
    description: 'Same stack with OVERLAY blend on top.\n\nExpected: higher contrast overlap vs screen.',
    body: `
const colors = [{ r: 0.8, g: 0.2, b: 0.2 }, { r: 0.2, g: 0.7, b: 0.3 }, { r: 0.2, g: 0.3, b: 0.8 }];
for (let i = 0; i < 3; i++) {
  const r = figma.createRectangle();
  r.resize(180, 120);
  r.x = 120 + i * 40;
  r.y = 100 + i * 30;
  r.fills = [{ type: 'SOLID', color: colors[i] }];
  if (i === 2) r.blendMode = 'OVERLAY';
  root.appendChild(r);
}
`,
  },
  {
    id: '67-polygon-star-row',
    title: 'Polygon star row',
    order: 67,
    tier: 'advanced',
    tags: ['shapes'],
    description: 'Polygon and star side by side.\n\nExpected: hexagon and star in a row.',
    body: `
const row = figma.createAutoLayout();
row.resize(280, 120);
row.x = 100;
row.y = 120;
row.itemSpacing = 24;
const poly = figma.createPolygon();
poly.pointCount = 6;
poly.resize(100, 100);
poly.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.25, b: 0.85 } }];
const star = figma.createStar();
star.pointCount = 5;
star.innerRadius = 0.45;
star.resize(100, 100);
star.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.75, b: 0.1 } }];
row.appendChild(poly);
row.appendChild(star);
root.appendChild(row);
`,
  },
  {
    id: '68-multi-line-angles',
    title: 'Multi line angles',
    order: 68,
    tier: 'advanced',
    tags: ['line'],
    description: 'Lines at 0, 45, 90 degrees.\n\nExpected: three spokes from center.',
    body: `
const angles = [0, 45, 90];
const colors = [{ r: 0.9, g: 0.2, b: 0.2 }, { r: 0.2, g: 0.7, b: 0.35 }, { r: 0.2, g: 0.4, b: 0.9 }];
for (let i = 0; i < 3; i++) {
  const line = figma.createLine();
  line.resize(160, 0);
  line.x = 160;
  line.y = 180;
  line.rotation = angles[i];
  line.strokes = [{ type: 'SOLID', color: colors[i] }];
  line.strokeWeight = 4;
  root.appendChild(line);
}
`,
  },
  {
    id: '69-boolean-intersect',
    title: 'Boolean intersect',
    order: 69,
    tier: 'advanced',
    tags: ['boolean'],
    description: 'intersect circle and square.\n\nExpected: lens-shaped intersection.',
    body: `
const sq = figma.createRectangle();
sq.resize(120, 120);
sq.x = 150;
sq.y = 120;
sq.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
root.appendChild(sq);
const circ = figma.createEllipse();
circ.resize(120, 120);
circ.x = 210;
circ.y = 120;
circ.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
root.appendChild(circ);
figma.intersect([sq, circ], root);
`,
  },
  {
    id: '70-boolean-exclude',
    title: 'Boolean exclude',
    order: 70,
    tier: 'advanced',
    tags: ['boolean'],
    description: 'exclude overlapping shapes.\n\nExpected: XOR-like combined shape.',
    body: `
const sq = figma.createRectangle();
sq.resize(120, 120);
sq.x = 150;
sq.y = 120;
sq.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.9 } }];
root.appendChild(sq);
const circ = figma.createEllipse();
circ.resize(120, 120);
circ.x = 210;
circ.y = 120;
circ.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.9 } }];
root.appendChild(circ);
figma.exclude([sq, circ], root);
`,
  },
  {
    id: '71-nested-autolayout',
    title: 'Nested auto layout',
    order: 71,
    tier: 'advanced',
    tags: ['autolayout'],
    description:
      'Outer column stacking two nested auto-layout mini-cards.\nEach card: horizontal chip row + white panel below.\n\nExpected: two identical cards vertically stacked inside the tinted column frame.',
    body: `
function makeCard() {
  const card = figma.createFrame();
  card.layoutMode = 'VERTICAL';
  card.itemSpacing = 8;
  card.fills = [{ type: 'SOLID', color: { r: 0.99, g: 0.99, b: 1 } }];
  const row = figma.createAutoLayout('HORIZONTAL');
  row.itemSpacing = 10;
  row.primaryAxisAlignItems = 'MIN';
  const wide = figma.createRectangle();
  wide.resize(76, 26);
  wide.fills = [{ type: 'SOLID', color: { r: 0.22, g: 0.48, b: 0.88 } }];
  const accent = figma.createRectangle();
  accent.resize(26, 26);
  accent.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.32, b: 0.9 } }];
  row.appendChild(wide);
  row.appendChild(accent);
  card.appendChild(row);
  const body = figma.createRectangle();
  body.resize(112, 40);
  body.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.appendChild(body);
  card.resize(120, 86);
  return card;
}
const col = figma.createFrame();
col.layoutMode = 'VERTICAL';
col.itemSpacing = 14;
col.x = 120;
col.y = 72;
col.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
col.paddingTop = 14;
col.paddingLeft = 14;
col.paddingRight = 14;
col.paddingBottom = 14;
root.appendChild(col);
col.appendChild(makeCard());
col.appendChild(makeCard());
`,
  },
  {
    id: '72-autolayout-spacer',
    title: 'Auto layout spacer',
    order: 72,
    tier: 'advanced',
    tags: ['autolayout'],
    description: 'Fixed spacer between FILL siblings.\n\nExpected: gray gap between expanding panels.',
    body: `
const row = figma.createAutoLayout();
row.resize(400, 48);
row.x = 40;
row.y = 156;
row.itemSpacing = 0;
const left = figma.createRectangle();
left.resize(80, 40);
left.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.9 } }];
const spacer = figma.createRectangle();
spacer.resize(24, 40);
spacer.fills = [{ type: 'SOLID', color: { r: 0.75, g: 0.77, b: 0.82 } }];
const right = figma.createRectangle();
right.resize(80, 40);
right.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
root.appendChild(row);
row.appendChild(left);
left.layoutSizingHorizontal = 'FILL';
row.appendChild(spacer);
row.appendChild(right);
right.layoutSizingHorizontal = 'FILL';
`,
  },
  {
    id: '73-layout-grow-siblings',
    title: 'Layout grow siblings',
    order: 73,
    tier: 'advanced',
    tags: ['autolayout', 'layoutGrow'],
    description: 'Two children layoutGrow 1.\n\nExpected: equal width columns.',
    body: `
const row = figma.createAutoLayout();
row.resize(360, 56);
row.x = 60;
row.y = 150;
row.itemSpacing = 12;
const a = figma.createRectangle();
a.resize(60, 40);
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.25 } }];
const b = figma.createRectangle();
b.resize(60, 40);
b.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.9 } }];
row.appendChild(a);
a.layoutGrow = 1;
row.appendChild(b);
b.layoutGrow = 1;
root.appendChild(row);
`,
  },
  {
    id: '74-counter-axis-stretch',
    title: 'Counter axis stretch',
    order: 74,
    tier: 'advanced',
    tags: ['autolayout'],
    description:
      'Attach the vertical column to the root before children. Full-width bars: set layoutSizingHorizontal = FILL only after each rectangle is a child of that column.\n\nExpected: rectangles span the column width between horizontal padding.',
    body: `
const col = figma.createFrame();
col.layoutMode = 'VERTICAL';
col.itemSpacing = 8;
col.resize(200, 180);
col.x = 140;
col.y = 90;
col.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
col.paddingLeft = 12;
col.paddingRight = 12;
root.appendChild(col);
for (let i = 0; i < 3; i++) {
  const box = figma.createRectangle();
  box.resize(100, 32);
  box.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45 + i * 0.15, b: 0.85 } }];
  col.appendChild(box);
  box.layoutSizingHorizontal = 'FILL';
}
`,
  },
  {
    id: '75-space-between-row',
    title: 'Space between row',
    order: 75,
    tier: 'advanced',
    tags: ['autolayout'],
    description: 'SPACE_BETWEEN with 4 items.\n\nExpected: items pinned to edges and distributed.',
    body: `
const row = figma.createAutoLayout();
row.resize(400, 40);
row.x = 40;
row.y = 160;
row.primaryAxisAlignItems = 'SPACE_BETWEEN';
for (let i = 0; i < 4; i++) {
  const dot = figma.createEllipse();
  dot.resize(24, 24);
  dot.fills = [{ type: 'SOLID', color: { r: 0.15 + i * 0.2, g: 0.45, b: 0.85 } }];
  row.appendChild(dot);
}
root.appendChild(row);
`,
  },
  {
    id: '76-asymmetric-padding',
    title: 'Asymmetric padding',
    order: 76,
    tier: 'advanced',
    tags: ['autolayout'],
    description: 'Distinct L/T/R/B padding.\n\nExpected: content hugging top-left with large bottom-right padding.',
    body: `
const row = figma.createAutoLayout();
row.x = 120;
row.y = 100;
row.paddingLeft = 8;
row.paddingTop = 48;
row.paddingRight = 64;
row.paddingBottom = 16;
row.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.95 } }];
const child = figma.createRectangle();
child.resize(120, 40);
child.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.55, b: 0.9 } }];
row.appendChild(child);
root.appendChild(row);
`,
  },
  {
    id: '77-dual-absolute-overlap',
    title: 'Dual absolute overlap',
    order: 77,
    tier: 'advanced',
    tags: ['absolute', 'z-index'],
    description:
      'Two absolute children same position; badge on top.\n\nExpected: red badge circle covers blue icon square.',
    body: `
const host = figma.createAutoLayout();
host.resize(200, 120);
host.x = 140;
host.y = 120;
const icon = figma.createRectangle();
icon.resize(48, 48);
icon.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45, b: 0.9 } }];
const badge = figma.createEllipse();
badge.resize(28, 28);
badge.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.2, b: 0.2 } }];
host.appendChild(icon);
icon.layoutPositioning = 'ABSOLUTE';
icon.x = 76;
icon.y = 36;
host.appendChild(badge);
badge.layoutPositioning = 'ABSOLUTE';
badge.x = 100;
badge.y = 28;
root.appendChild(host);
`,
  },
  {
    id: '78-constraints-pin-vertical',
    title: 'Constraints pin vertical',
    order: 78,
    tier: 'advanced',
    tags: ['constraints'],
    description: 'Top+bottom pinned child.\n\nExpected: bar stretches vertically in tall parent.',
    body: `
const parent = figma.createFrame();
parent.resize(120, 220);
parent.x = 180;
parent.y = 70;
parent.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.91, b: 0.94 } }];
const child = figma.createRectangle();
child.resize(80, 40);
child.x = 20;
child.constraints = { horizontal: 'CENTER', vertical: 'STRETCH' };
child.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.5, b: 0.85 } }];
parent.appendChild(child);
root.appendChild(parent);
`,
  },
  {
    id: '79-constraints-scale-horizontal',
    title: 'Constraints scale horizontal',
    order: 79,
    tier: 'advanced',
    tags: ['constraints'],
    description: 'Horizontal scale constraints.\n\nExpected: wide bar scaled to parent width.',
    body: `
const parent = figma.createFrame();
parent.resize(360, 80);
parent.x = 60;
parent.y = 140;
parent.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
const child = figma.createRectangle();
child.resize(100, 32);
child.y = 24;
child.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
child.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.45, b: 0.15 } }];
parent.appendChild(child);
root.appendChild(parent);
`,
  },
  {
    id: '80-grid-plus-autolayout',
    title: 'Grid plus auto layout',
    order: 80,
    tier: 'advanced',
    tags: ['layoutGrids', 'autolayout'],
    description: 'Grid frame with toolbar auto-layout inside.\n\nExpected: column grid with horizontal tool buttons.',
    body: `
const frame = figma.createFrame();
frame.resize(400, 120);
frame.x = 40;
frame.y = 120;
frame.layoutGrids = [
  {
    pattern: 'COLUMNS',
    alignment: 'MIN',
    sectionSize: 80,
    gutterSize: 12,
    count: Infinity,
    offset: 0,
    color: { r: 0, g: 0.3, b: 0.8, a: 0.12 },
  },
];
const toolbar = figma.createAutoLayout();
toolbar.itemSpacing = 8;
toolbar.x = 16;
toolbar.y = 40;
for (let i = 0; i < 4; i++) {
  const btn = figma.createRectangle();
  btn.resize(48, 32);
  btn.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45 + i * 0.1, b: 0.85 } }];
  toolbar.appendChild(btn);
}
frame.appendChild(toolbar);
root.appendChild(frame);
`,
  },
  {
    id: '81-mask-over-image',
    title: 'Mask over image',
    order: 81,
    tier: 'advanced',
    tags: ['mask', 'image'],
    description: 'Circle mask on image fill.\n\nExpected: circular photo crop.',
    body: `
const img = figma.createImage(new Uint8Array(${pngLiteral()}));
const photo = figma.createRectangle();
photo.resize(240, 180);
photo.x = 120;
photo.y = 90;
photo.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
root.appendChild(photo);
const mask = figma.createEllipse();
mask.resize(160, 160);
mask.x = 160;
mask.y = 100;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
`,
  },
  {
    id: '82-sequential-masks',
    title: 'Sequential masks',
    order: 82,
    tier: 'advanced',
    tags: ['mask'],
    description: 'Two mask regions in one parent.\n\nExpected: two circular windows into gradient.',
    body: `
const grad = figma.createRectangle();
grad.resize(400, 200);
grad.x = 40;
grad.y = 80;
grad.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.2, g: 0.5, b: 1, a: 1 } }, { position: 1, color: { r: 0.9, g: 0.2, b: 0.5, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(grad);
for (const x of [80, 260]) {
  const m = figma.createEllipse();
  m.resize(100, 100);
  m.x = x;
  m.y = 130;
  m.isMask = true;
  m.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  root.appendChild(m);
}
`,
  },
  {
    id: '83-mask-and-clip',
    title: 'Mask and clip',
    order: 83,
    tier: 'advanced',
    tags: ['mask', 'clip'],
    description: 'Mask plus clipsContent on root.\n\nExpected: masked content clipped to artboard.',
    body: `
root.clipsContent = true;
const content = figma.createRectangle();
content.resize(300, 200);
content.x = 200;
content.y = 100;
content.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.65, b: 0.4 } }];
root.appendChild(content);
const mask = figma.createRectangle();
mask.resize(200, 200);
mask.x = 140;
mask.y = 80;
mask.cornerRadius = 100;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
`,
  },
  {
    id: '84-rotated-mask',
    title: 'Rotated mask',
    order: 84,
    tier: 'advanced',
    tags: ['mask', 'rotation'],
    description: 'Mask shape rotated 30deg.\n\nExpected: diagonal window into gradient fill.',
    body: `
const content = figma.createRectangle();
content.resize(320, 200);
content.x = 80;
content.y = 80;
content.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.9, g: 0.3, b: 0.2, a: 1 } }, { position: 1, color: { r: 0.2, g: 0.3, b: 0.9, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(content);
const mask = figma.createRectangle();
mask.resize(140, 200);
mask.x = 170;
mask.y = 80;
mask.rotation = 30;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
`,
  },
  {
    id: '85-shadow-plus-mask',
    title: 'Shadow plus mask',
    order: 85,
    tier: 'advanced',
    tags: ['mask', 'effects'],
    description: 'Shadow on back card; masked front content.\n\nExpected: shadow visible on rear card; front masked gradient.',
    body: `
const back = figma.createRectangle();
back.resize(220, 140);
back.x = 130;
back.y = 130;
back.cornerRadius = 12;
back.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
back.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 10 }, radius: 20, blendMode: 'NORMAL', visible: true }];
root.appendChild(back);
const front = figma.createRectangle();
front.resize(200, 120);
front.x = 140;
front.y = 100;
front.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.3, g: 0.6, b: 1, a: 1 } }, { position: 1, color: { r: 0.8, g: 0.2, b: 0.6, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(front);
const mask = figma.createEllipse();
mask.resize(120, 120);
mask.x = 180;
mask.y = 110;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
`,
  },
  {
    id: '86-nested-clip-frames',
    title: 'Nested clip frames',
    order: 86,
    tier: 'advanced',
    tags: ['clip'],
    description: 'Outer clips, inner does not.\n\nExpected: bleed contained by outer only.',
    body: `
const outer = figma.createFrame();
outer.resize(280, 160);
outer.x = 100;
outer.y = 100;
outer.clipsContent = true;
outer.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.96 } }];
const inner = figma.createFrame();
inner.resize(200, 120);
inner.x = 60;
inner.y = 20;
inner.clipsContent = false;
inner.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.88, b: 0.92 } }];
const child = figma.createRectangle();
child.resize(120, 80);
child.x = 80;
child.y = 60;
child.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.35, b: 0.15 } }];
inner.appendChild(child);
outer.appendChild(inner);
root.appendChild(outer);
`,
  },
  {
    id: '87-blur-overlay-stack',
    title: 'Blur overlay stack',
    order: 87,
    tier: 'advanced',
    tags: ['blur', 'stacking'],
    description: 'Striped bg + backdrop blur + white overlay.\n\nExpected: frosted panel with 50% white veil on top.',
    body: `
for (let i = 0; i < 4; i++) {
  const s = figma.createRectangle();
  s.resize(480, 50);
  s.y = i * 90;
  s.fills = [{ type: 'SOLID', color: { r: (i % 2) * 0.7, g: 0.25, b: 0.65 } }];
  root.appendChild(s);
}
const blur = figma.createFrame();
blur.resize(300, 140);
blur.x = 90;
blur.y = 110;
blur.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.25 } }];
blur.effects = [{ type: 'BACKGROUND_BLUR', radius: 16, visible: true }];
root.appendChild(blur);
const veil = figma.createRectangle();
veil.resize(300, 140);
veil.x = 90;
veil.y = 110;
veil.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.5 } }];
root.appendChild(veil);
`,
  },
  {
    id: '88-double-drop-shadow',
    title: 'Double drop shadow',
    order: 88,
    tier: 'advanced',
    tags: ['effects'],
    description: 'Two DROP_SHADOW effects.\n\nExpected: layered shadow depth.',
    body: `
const card = figma.createRectangle();
card.resize(220, 120);
card.x = 130;
card.y = 120;
card.cornerRadius = 12;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.effects = [
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 4 }, radius: 8, blendMode: 'NORMAL', visible: true },
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 16 }, radius: 32, blendMode: 'NORMAL', visible: true },
];
root.appendChild(card);
`,
  },
  {
    id: '89-vector-on-gradient',
    title: 'Vector on gradient',
    order: 89,
    tier: 'advanced',
    tags: ['vector', 'gradient'],
    description: 'VECTOR icon on gradient background.\n\nExpected: white triangle centered on gradient rect.',
    body: `
const bg = figma.createRectangle();
bg.resize(320, 200);
bg.x = 80;
bg.y = 80;
bg.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.1, g: 0.35, b: 0.85, a: 1 } }, { position: 1, color: { r: 0.5, g: 0.2, b: 0.75, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(bg);
const vec = figma.createVector();
vec.resize(80, 70);
vec.x = 200;
vec.y = 145;
vec.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 40 8 L 72 62 L 8 62 Z' }];
vec.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(vec);
`,
  },
  {
    id: '90-transform-group-mask',
    title: 'Transform group mask',
    order: 90,
    tier: 'advanced',
    tags: ['transformGroup', 'mask'],
    description: 'Rotated transformGroup with masked child.\n\nExpected: rotated masked gradient block.',
    body: `
const content = figma.createRectangle();
content.resize(180, 120);
content.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.2, g: 0.6, b: 1, a: 1 } }, { position: 1, color: { r: 0.9, g: 0.3, b: 0.5, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(content);
const mask = figma.createEllipse();
mask.resize(100, 100);
mask.x = 40;
mask.y = 10;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
const a = figma.createRectangle();
a.resize(40, 40);
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
root.appendChild(a);
const tg = figma.transformGroup([content, mask, a], root, 0, []);
tg.x = 150;
tg.y = 110;
tg.rotation = 15;
`,
  },
  {
    id: '91-string-variable-text',
    title: 'String variable text',
    order: 91,
    tier: 'advanced',
    tags: ['variables', 'text'],
    needsFont: true,
    description: 'STRING variable bound to characters.\n\nExpected: text reads token value "Hello".',
    body: `
const col = figma.variables.createVariableCollection('Copy');
const modeId = col.modes[0].modeId;
const label = figma.variables.createVariable('greeting', col, 'STRING');
label.setValueForMode(modeId, 'Hello');
const text = figma.createText();
text.x = 180;
text.y = 160;
text.fontSize = 20;
text.setBoundVariable('characters', label);
root.appendChild(text);
`,
  },
  {
    id: '92-variable-alias-color',
    title: 'Variable alias color',
    order: 92,
    tier: 'advanced',
    tags: ['variables'],
    description: 'COLOR alias chain.\n\nExpected: rect uses resolved alias color (green).',
    body: `
const col = figma.variables.createVariableCollection('Brand');
const modeId = col.modes[0].modeId;
const base = figma.variables.createVariable('base', col, 'COLOR');
base.setValueForMode(modeId, { r: 0.2, g: 0.75, b: 0.35 });
const alias = figma.variables.createVariable('accent', col, 'COLOR');
alias.setValueForMode(modeId, figma.variables.createVariableAlias(base));
const rect = figma.createRectangle();
rect.resize(200, 100);
rect.x = 140;
rect.y = 130;
root.appendChild(rect);
rect.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', alias)];
`,
  },
  {
    id: '93-variable-mode-switch',
    title: 'Variable mode switch',
    order: 93,
    tier: 'advanced',
    tags: ['variables'],
    description: 'Two modes; active mode sets fill.\n\nExpected: rectangle uses Dark mode blue.',
    body: `
const col = figma.variables.createVariableCollection('Theme');
const lightId = col.modes[0].modeId;
const darkId = col.addMode('Dark');
const theme = figma.variables.createVariable('bg', col, 'COLOR');
theme.setValueForMode(lightId, { r: 0.95, g: 0.96, b: 0.98 });
theme.setValueForMode(darkId, { r: 0.1, g: 0.15, b: 0.35 });
root.setExplicitVariableModeForCollection(col, darkId);
const rect = figma.createRectangle();
rect.resize(280, 180);
rect.x = 100;
rect.y = 90;
root.appendChild(rect);
rect.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', theme)];
`,
  },
  {
    id: '94-effect-style-card',
    title: 'Effect style card',
    order: 94,
    tier: 'advanced',
    tags: ['styles', 'effects'],
    description: 'Effect style on card.\n\nExpected: shared shadow from effect style.',
    body: `
const fx = figma.createEffectStyle();
fx.name = 'CardShadow';
fx.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 12 }, radius: 24, blendMode: 'NORMAL', visible: true }];
const card = figma.createRectangle();
card.resize(220, 120);
card.x = 130;
card.y = 120;
card.cornerRadius = 12;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.effectStyleId = fx.id;
root.appendChild(card);
`,
  },
  {
    id: '95-grid-style-frame',
    title: 'Grid style frame',
    order: 95,
    tier: 'advanced',
    tags: ['styles', 'layoutGrids'],
    description: 'Grid style applied to frame.\n\nExpected: column grid from style.',
    body: `
const gridStyle = figma.createGridStyle();
gridStyle.name = 'Columns8';
gridStyle.layoutGrids = [
  {
    pattern: 'COLUMNS',
    alignment: 'MIN',
    sectionSize: 48,
    gutterSize: 8,
    count: Infinity,
    offset: 0,
    color: { r: 0, g: 0.4, b: 0.7, a: 0.18 },
  },
];
const frame = figma.createFrame();
frame.resize(400, 200);
frame.x = 40;
frame.y = 80;
frame.layoutGrids = gridStyle.layoutGrids;
root.appendChild(frame);
`,
  },
  {
    id: '96-instance-fill-override',
    title: 'Instance fill override',
    order: 96,
    tier: 'advanced',
    tags: ['components'],
    description: 'Instance overrides child fill.\n\nExpected: button instance with orange fill vs blue component.',
    body: `
const frame = figma.createFrame();
frame.resize(100, 40);
frame.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);
const inst = comp.createInstance();
inst.x = 190;
inst.y = 160;
root.appendChild(inst);
if (inst.children && inst.children[0]) {
  inst.children[0].fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.5, b: 0.1 } }];
}
`,
  },
  {
    id: '97-variant-matrix',
    title: 'Variant matrix',
    order: 97,
    tier: 'advanced',
    tags: ['components', 'variants'],
    needsFont: true,
    description: '2x2 variant instances in grid.\n\nExpected: four button variants visible.',
    body: `
const variants = [];
for (const color of ['blue', 'green']) {
  const f = figma.createFrame();
  f.resize(80, 32);
  f.fills = [{ type: 'SOLID', color: color === 'blue' ? { r: 0.2, g: 0.5, b: 0.9 } : { r: 0.2, g: 0.7, b: 0.35 } }];
  figma.currentPage.appendChild(f);
  variants.push(figma.createComponentFromNode(f));
}
const set = figma.combineAsVariants(variants, figma.currentPage);
let i = 0;
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 2; col++) {
    const inst = variants[col].createInstance();
    inst.x = 100 + col * 100;
    inst.y = 100 + row * 48;
    root.appendChild(inst);
    i++;
  }
}
`,
  },
  {
    id: '98-nested-instances',
    title: 'Nested instances',
    order: 98,
    tier: 'advanced',
    tags: ['components'],
    needsFont: true,
    description: 'Card instance containing button instance.\n\nExpected: nested component structure rendered.',
    body: `
const btnFrame = figma.createFrame();
btnFrame.resize(72, 28);
btnFrame.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
figma.currentPage.appendChild(btnFrame);
const btnComp = figma.createComponentFromNode(btnFrame);
const cardFrame = figma.createFrame();
cardFrame.resize(200, 100);
cardFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
const btnInst = btnComp.createInstance();
btnInst.x = 64;
btnInst.y = 36;
cardFrame.appendChild(btnInst);
figma.currentPage.appendChild(cardFrame);
const cardComp = figma.createComponentFromNode(cardFrame);
const cardInst = cardComp.createInstance();
cardInst.x = 140;
cardInst.y = 130;
root.appendChild(cardInst);
`,
  },
  {
    id: '99-kanban-variable-board',
    title: 'Kanban variable board',
    order: 99,
    tier: 'advanced',
    tags: ['composite', 'variables', 'autoLayout'],
    needsFont: true,
    description:
      'Nested auto-layout Kanban: STRING sprint title + bound COLOR column shells, card stacks with shadows/strokes, and a COLOR alias chain on progress bars.\n\nExpected: three tinted columns, header pill, cards with blue bars resolving alias color.',
    body: `
const board = figma.variables.createVariableCollection('Kanban');
const modeId = board.modes[0].modeId;
const sprintTitle = figma.variables.createVariable('sprintTitle', board, 'STRING');
sprintTitle.setValueForMode(modeId, 'Sprint 24 · Ship milestones');
const tintTodo = figma.variables.createVariable('colTodo', board, 'COLOR');
tintTodo.setValueForMode(modeId, { r: 0.93, g: 0.95, b: 1 });
const tintDoing = figma.variables.createVariable('colDoing', board, 'COLOR');
tintDoing.setValueForMode(modeId, { r: 0.97, g: 0.93, b: 1 });
const tintDone = figma.variables.createVariable('colDone', board, 'COLOR');
tintDone.setValueForMode(modeId, { r: 0.92, g: 1, b: 0.95 });
const statusPill = figma.variables.createVariable('statusPill', board, 'COLOR');
statusPill.setValueForMode(modeId, { r: 0.14, g: 0.68, b: 0.42 });
const barBase = figma.variables.createVariable('barBase', board, 'COLOR');
barBase.setValueForMode(modeId, { r: 0.1, g: 0.45, b: 0.95 });
const barResolved = figma.variables.createVariable('barViaAlias', board, 'COLOR');
barResolved.setValueForMode(modeId, figma.variables.createVariableAlias(barBase));
function makeCard(i) {
  const card = createAutoLayout('VERTICAL');
  card.itemSpacing = 6;
  card.paddingTop = 8;
  card.paddingLeft = 8;
  card.paddingRight = 8;
  card.paddingBottom = 8;
  card.cornerRadius = 8;
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.89, b: 0.94 } }];
  card.strokeWeight = 1;
  card.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 8, blendMode: 'NORMAL', visible: true }];
  const line1 = figma.createText();
  line1.characters = i % 2 === 0 ? 'Spec tokens' : 'E2E harness';
  line1.fontSize = 12;
  const bar = figma.createRectangle();
  bar.resize(108, 5);
  bar.cornerRadius = 3;
  bar.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', barResolved)];
  const tags = createAutoLayout('HORIZONTAL');
  tags.itemSpacing = 4;
  const a = figma.createRectangle();
  a.resize(40, 12);
  a.cornerRadius = 4;
  a.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
  const b = figma.createRectangle();
  b.resize(32, 12);
  b.cornerRadius = 4;
  b.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.93, b: 1 } }];
  tags.appendChild(a);
  tags.appendChild(b);
  card.appendChild(line1);
  card.appendChild(bar);
  card.appendChild(tags);
  return card;
}
function makeColumn(tintVar, heading, nCards) {
  const shell = createAutoLayout('VERTICAL');
  shell.itemSpacing = 8;
  shell.paddingTop = 10;
  shell.paddingLeft = 8;
  shell.paddingRight = 8;
  shell.paddingBottom = 10;
  shell.cornerRadius = 10;
  shell.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.98 } }, 'color', tintVar)];
  const h = figma.createText();
  h.characters = heading;
  h.fontSize = 11;
  shell.appendChild(h);
  for (let i = 0; i < nCards; i++) shell.appendChild(makeCard(i + (heading === 'Doing' ? 2 : 0)));
  shell.resize(138, 252);
  return shell;
}
const header = createAutoLayout('HORIZONTAL');
header.resize(440, 40);
header.x = 20;
header.y = 14;
header.itemSpacing = 14;
header.counterAxisAlignItems = 'CENTER';
header.primaryAxisAlignItems = 'SPACE_BETWEEN';
const boardTitle = figma.createText();
boardTitle.fontSize = 17;
boardTitle.setBoundVariable('characters', sprintTitle);
const pill = createAutoLayout('HORIZONTAL');
pill.paddingLeft = 12;
pill.paddingRight = 12;
pill.paddingTop = 5;
pill.paddingBottom = 5;
pill.cornerRadius = 16;
pill.counterAxisAlignItems = 'CENTER';
pill.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', statusPill)];
const pillLabel = figma.createText();
pillLabel.characters = 'On track';
pillLabel.fontSize = 11;
pillLabel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
pill.appendChild(pillLabel);
header.appendChild(boardTitle);
header.appendChild(pill);
root.appendChild(header);
const lanes = createAutoLayout('HORIZONTAL');
lanes.resize(440, 268);
lanes.x = 20;
lanes.y = 62;
lanes.itemSpacing = 10;
lanes.counterAxisAlignItems = 'MAX';
lanes.appendChild(makeColumn(tintTodo, 'Backlog', 3));
lanes.appendChild(makeColumn(tintDoing, 'Doing', 2));
lanes.appendChild(makeColumn(tintDone, 'Done', 2));
root.appendChild(lanes);
`,
  },
  {
    id: '100-mega-ui-screen',
    title: 'Mega UI screen',
    order: 100,
    tier: 'advanced',
    tags: ['composite', 'mega'],
    needsFont: true,
    description:
      'Full screen: header, hero, mask, badge, variables, instances, blur modal, overlapping cards.\n\nExpected: rich UI with clear z-order — modal and badge on top.',
    body: `
const brand = figma.variables.createVariableCollection('UI');
const modeId = brand.modes[0].modeId;
const primary = figma.variables.createVariable('primary', brand, 'COLOR');
primary.setValueForMode(modeId, { r: 0.15, g: 0.45, b: 0.95 });
const header = figma.createAutoLayout();
header.resize(440, 48);
header.x = 20;
header.y = 12;
header.itemSpacing = 16;
header.counterAxisAlignItems = 'CENTER';
header.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
const logo = figma.createRectangle();
logo.resize(28, 28);
logo.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
header.appendChild(logo);
const nav = figma.createText();
nav.characters = 'Product  Pricing';
nav.fontSize = 13;
header.appendChild(nav);
root.appendChild(header);
const hero = figma.createRectangle();
hero.resize(440, 120);
hero.x = 20;
hero.y = 68;
hero.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.1, g: 0.35, b: 0.85, a: 1 } }, { position: 1, color: { r: 0.45, g: 0.2, b: 0.75, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(hero);
const avatar = figma.createEllipse();
avatar.resize(64, 64);
avatar.x = 48;
avatar.y = 96;
avatar.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.75, b: 0.5 } }];
root.appendChild(avatar);
const avatarMask = figma.createEllipse();
avatarMask.resize(64, 64);
avatarMask.x = 48;
avatarMask.y = 96;
avatarMask.isMask = true;
avatarMask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(avatarMask);
const badge = figma.createEllipse();
badge.resize(20, 20);
badge.x = 400;
badge.y = 20;
badge.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.2, b: 0.2 } }];
root.appendChild(badge);
for (let i = 0; i < 2; i++) {
  const card = figma.createRectangle();
  card.resize(160, 90);
  card.x = 40 + i * 120;
  card.y = 200 + i * 12;
  card.cornerRadius = 10;
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.15 }, offset: { x: 0, y: 4 }, radius: 12, blendMode: 'NORMAL', visible: true }];
  root.appendChild(card);
}
const modal = figma.createFrame();
modal.resize(280, 100);
modal.x = 100;
modal.y = 210;
modal.cornerRadius = 12;
modal.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.35 } }];
modal.effects = [{ type: 'BACKGROUND_BLUR', radius: 12, visible: true }];
root.appendChild(modal);
`,
  },
  {
    id: '101-settings-workspace-shell',
    title: 'Settings workspace shell',
    order: 101,
    tier: 'advanced',
    tags: ['composite', 'settings', 'variables', 'autoLayout'],
    needsFont: true,
    description:
      'Settings screen: variable-bound surfaces, left nav rail, General copy block, toggle capsule, select row with chevron, and dividers.\n\nExpected: two-column shell with highlighted nav item and interactive-looking controls.',
    body: `
const col = figma.variables.createVariableCollection('Settings');
const modeId = col.modes[0].modeId;
const accent = figma.variables.createVariable('accent', col, 'COLOR');
accent.setValueForMode(modeId, { r: 0.2, g: 0.48, b: 0.95 });
const railBg = figma.variables.createVariable('rail', col, 'COLOR');
railBg.setValueForMode(modeId, { r: 0.97, g: 0.97, b: 0.99 });
const shell = createAutoLayout('HORIZONTAL');
shell.resize(440, 318);
shell.x = 20;
shell.y = 21;
shell.itemSpacing = 12;
const rail = createAutoLayout('VERTICAL');
rail.resize(112, 318);
rail.paddingTop = 14;
rail.paddingLeft = 10;
rail.paddingRight = 10;
rail.paddingBottom = 12;
rail.itemSpacing = 6;
rail.cornerRadius = 14;
rail.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', railBg)];
rail.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.89, b: 0.93 } }];
rail.strokeWeight = 1;
function navRow(label, active) {
  const row = createAutoLayout('HORIZONTAL');
  row.resize(92, 34);
  row.paddingLeft = 10;
  row.paddingRight = 10;
  row.cornerRadius = 9;
  row.counterAxisAlignItems = 'CENTER';
  if (active) {
    row.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.95, b: 1 } }];
  }
  const t = figma.createText();
  t.characters = label;
  t.fontSize = 11;
  t.fills = [{ type: 'SOLID', color: active ? { r: 0.12, g: 0.35, b: 0.88 } : { r: 0.38, g: 0.4, b: 0.48 } }];
  row.appendChild(t);
  return row;
}
rail.appendChild(navRow('General', true));
rail.appendChild(navRow('Team', false));
rail.appendChild(navRow('Billing', false));
rail.appendChild(navRow('Notifications', false));
const pane = createAutoLayout('VERTICAL');
pane.resize(316, 318);
pane.paddingTop = 16;
pane.paddingLeft = 18;
pane.paddingRight = 18;
pane.paddingBottom = 14;
pane.itemSpacing = 14;
pane.cornerRadius = 14;
pane.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
pane.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.89, b: 0.93 } }];
pane.strokeWeight = 1;
const h1 = figma.createText();
h1.characters = 'Workspace defaults';
h1.fontSize = 18;
h1.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.1, b: 0.14 } }];
pane.appendChild(h1);
const lead = figma.createText();
lead.characters = 'Org-wide rules for libraries, exports, and review flows.';
lead.fontSize = 11;
lead.fills = [{ type: 'SOLID', color: { r: 0.42, g: 0.45, b: 0.52 } }];
pane.appendChild(lead);
const rule = figma.createRectangle();
rule.resize(268, 1);
rule.fills = [{ type: 'SOLID', color: { r: 0.91, g: 0.92, b: 0.95 } }];
pane.appendChild(rule);
const rowToggle = createAutoLayout('HORIZONTAL');
rowToggle.resize(280, 44);
rowToggle.primaryAxisAlignItems = 'SPACE_BETWEEN';
rowToggle.counterAxisAlignItems = 'CENTER';
const stack = createAutoLayout('VERTICAL');
stack.itemSpacing = 3;
const a = figma.createText();
a.characters = 'Auto-save version history';
a.fontSize = 12;
a.fills = [{ type: 'SOLID', color: { r: 0.14, g: 0.15, b: 0.2 } }];
const b = figma.createText();
b.characters = 'Capture checkpoints while editors are open';
b.fontSize = 10;
b.fills = [{ type: 'SOLID', color: { r: 0.48, g: 0.5, b: 0.56 } }];
stack.appendChild(a);
stack.appendChild(b);
const cap = figma.createFrame();
cap.resize(52, 28);
cap.fills = [];
const track = figma.createRectangle();
track.resize(46, 22);
track.x = 3;
track.y = 3;
track.cornerRadius = 11;
track.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', accent)];
const knob = figma.createEllipse();
knob.resize(18, 18);
knob.x = 28;
knob.y = 5;
knob.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
cap.appendChild(track);
cap.appendChild(knob);
rowToggle.appendChild(stack);
rowToggle.appendChild(cap);
pane.appendChild(rowToggle);
const row2 = createAutoLayout('HORIZONTAL');
row2.resize(280, 40);
row2.primaryAxisAlignItems = 'SPACE_BETWEEN';
row2.counterAxisAlignItems = 'CENTER';
row2.cornerRadius = 10;
row2.paddingLeft = 12;
row2.paddingRight = 12;
row2.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.98, b: 0.99 } }];
const l2 = figma.createText();
l2.characters = 'Default review branch';
l2.fontSize = 12;
l2.fills = [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.22 } }];
const chev = figma.createText();
chev.characters = 'main  \u203a';
chev.fontSize = 12;
chev.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.48, b: 0.55 } }];
row2.appendChild(l2);
row2.appendChild(chev);
pane.appendChild(row2);
shell.appendChild(rail);
shell.appendChild(pane);
root.appendChild(shell);
`,
  },
  {
    id: '102-analytics-kpi-strip',
    title: 'Analytics KPI strip',
    order: 102,
    tier: 'advanced',
    tags: ['composite', 'dashboard', 'autoLayout'],
    needsFont: true,
    description:
      'Dashboard chrome: title with range chip, three KPI cards with delta pills, and a sparkline built from rounded bars.\n\nExpected: metrics row and warm-neutral chart legible at 480×360.',
    body: `
const wrap = createAutoLayout('VERTICAL');
wrap.resize(440, 310);
wrap.x = 20;
wrap.y = 24;
wrap.itemSpacing = 14;
const top = createAutoLayout('HORIZONTAL');
top.resize(440, 40);
top.primaryAxisAlignItems = 'SPACE_BETWEEN';
top.counterAxisAlignItems = 'CENTER';
const brand = figma.createText();
brand.characters = 'Northwind Analytics';
brand.fontSize = 17;
brand.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.09, b: 0.14 } }];
const chip = createAutoLayout('HORIZONTAL');
chip.paddingLeft = 12;
chip.paddingRight = 12;
chip.paddingTop = 7;
chip.paddingBottom = 7;
chip.cornerRadius = 16;
chip.counterAxisAlignItems = 'CENTER';
chip.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
chip.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.88, b: 0.93 } }];
chip.strokeWeight = 1;
const chipT = figma.createText();
chipT.characters = 'Last 7 days';
chipT.fontSize = 11;
chipT.fills = [{ type: 'SOLID', color: { r: 0.32, g: 0.34, b: 0.42 } }];
chip.appendChild(chipT);
top.appendChild(brand);
top.appendChild(chip);
wrap.appendChild(top);
const cards = createAutoLayout('HORIZONTAL');
cards.resize(440, 108);
cards.itemSpacing = 10;
function kpi(title, value, delta, up) {
  const card = createAutoLayout('VERTICAL');
  card.resize(140, 108);
  card.paddingTop = 12;
  card.paddingLeft = 12;
  card.paddingRight = 12;
  card.paddingBottom = 12;
  card.itemSpacing = 10;
  card.cornerRadius = 12;
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.effects = [{ type: 'DROP_SHADOW', color: { r: 0.12, g: 0.2, b: 0.45, a: 0.12 }, offset: { x: 0, y: 6 }, radius: 14, blendMode: 'NORMAL', visible: true }];
  const t0 = figma.createText();
  t0.characters = title;
  t0.fontSize = 10;
  t0.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.47, b: 0.55 } }];
  const t1 = figma.createText();
  t1.characters = value;
  t1.fontSize = 22;
  t1.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.1, b: 0.16 } }];
  const pill = createAutoLayout('HORIZONTAL');
  pill.paddingLeft = 8;
  pill.paddingRight = 8;
  pill.paddingTop = 4;
  pill.paddingBottom = 4;
  pill.cornerRadius = 8;
  pill.counterAxisAlignItems = 'CENTER';
  pill.fills = [{ type: 'SOLID', color: up ? { r: 0.9, g: 0.98, b: 0.93 } : { r: 1, g: 0.93, b: 0.93 } }];
  const pt = figma.createText();
  pt.characters = delta;
  pt.fontSize = 10;
  pt.fills = [{ type: 'SOLID', color: up ? { r: 0.1, g: 0.52, b: 0.38 } : { r: 0.75, g: 0.18, b: 0.2 } }];
  pill.appendChild(pt);
  card.appendChild(t0);
  card.appendChild(t1);
  card.appendChild(pill);
  return card;
}
cards.appendChild(kpi('Active trials', '1,284', '+6.4%', true));
cards.appendChild(kpi('Conversion', '3.9%', '+0.3pt', true));
cards.appendChild(kpi('Churn', '0.8%', '-0.1pt', true));
wrap.appendChild(cards);
const chartShell = createAutoLayout('VERTICAL');
chartShell.resize(440, 140);
chartShell.paddingTop = 14;
chartShell.paddingLeft = 14;
chartShell.paddingRight = 14;
chartShell.paddingBottom = 14;
chartShell.itemSpacing = 10;
chartShell.cornerRadius = 14;
chartShell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
chartShell.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.94 } }];
chartShell.strokeWeight = 1;
const capT = figma.createText();
capT.characters = 'Engagement Index';
capT.fontSize = 12;
capT.fills = [{ type: 'SOLID', color: { r: 0.22, g: 0.24, b: 0.3 } }];
chartShell.appendChild(capT);
const bars = createAutoLayout('HORIZONTAL');
bars.resize(400, 72);
bars.itemSpacing = 6;
bars.counterAxisAlignItems = 'MAX';
const hVals = [28, 44, 36, 58, 42, 66, 52];
const warm = [{ r: 0.95, g: 0.65, b: 0.38 }, { r: 0.98, g: 0.72, b: 0.42 }, { r: 0.92, g: 0.55, b: 0.34 }, { r: 0.96, g: 0.62, b: 0.4 }, { r: 0.94, g: 0.58, b: 0.36 }, { r: 0.99, g: 0.75, b: 0.45 }, { r: 0.9, g: 0.52, b: 0.33 }];
for (let i = 0; i < 7; i++) {
  const bar = figma.createRectangle();
  bar.resize(44, hVals[i]);
  bar.cornerRadius = 8;
  bar.fills = [{ type: 'SOLID', color: warm[i] }];
  bars.appendChild(bar);
}
chartShell.appendChild(bars);
const foot = figma.createText();
foot.characters = 'Mon     Tue     Wed     Thu     Fri     Sat     Sun';
foot.fontSize = 9;
foot.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.56, b: 0.62 } }];
chartShell.appendChild(foot);
wrap.appendChild(chartShell);
root.appendChild(wrap);
`,
  },
  {
    id: '103-checkout-order-review',
    title: 'Checkout order review',
    order: 103,
    tier: 'advanced',
    tags: ['composite', 'checkout', 'autoLayout'],
    needsFont: true,
    description:
      'Checkout panel: hero bag summary, line items with thumbnails, promo field, totals ladder, and primary Pay CTA strip.\n\nExpected: readable commerce hierarchy with aligned prices.',
    body: `
const page = createAutoLayout('VERTICAL');
page.resize(432, 328);
page.x = 24;
page.y = 18;
page.itemSpacing = 12;
const hero = createAutoLayout('HORIZONTAL');
hero.resize(432, 56);
hero.paddingLeft = 14;
hero.paddingRight = 14;
hero.cornerRadius = 12;
hero.counterAxisAlignItems = 'CENTER';
hero.itemSpacing = 12;
hero.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.12, g: 0.18, b: 0.42, a: 1 } }, { position: 1, color: { r: 0.32, g: 0.22, b: 0.55, a: 1 } }], gradientTransform: [[1, 0, 0], [0, 1, 0]] }];
const bag = figma.createText();
bag.characters = 'Secure checkout';
bag.fontSize = 16;
bag.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
const subhero = figma.createText();
subhero.characters = 'Order ORD-9182';
subhero.fontSize = 11;
subhero.fills = [{ type: 'SOLID', color: { r: 0.82, g: 0.86, b: 0.95, a: 1 } }];
const heroStack = createAutoLayout('VERTICAL');
heroStack.itemSpacing = 2;
heroStack.appendChild(bag);
heroStack.appendChild(subhero);
hero.appendChild(heroStack);
page.appendChild(hero);
function line(title, price) {
  const row = createAutoLayout('HORIZONTAL');
  row.resize(408, 52);
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  row.counterAxisAlignItems = 'CENTER';
  row.paddingLeft = 10;
  row.paddingRight = 10;
  row.cornerRadius = 10;
  row.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  row.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.91, b: 0.94 } }];
  row.strokeWeight = 1;
  const left = createAutoLayout('HORIZONTAL');
  left.itemSpacing = 10;
  left.counterAxisAlignItems = 'CENTER';
  const thumb = figma.createRectangle();
  thumb.resize(40, 40);
  thumb.cornerRadius = 8;
  thumb.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.96 } }];
  const v = createAutoLayout('VERTICAL');
  v.itemSpacing = 3;
  const t1 = figma.createText();
  t1.characters = title;
  t1.fontSize = 12;
  t1.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.13, b: 0.18 } }];
  const t2 = figma.createText();
  t2.characters = 'Qty 1 · Digital';
  t2.fontSize = 10;
  t2.fills = [{ type: 'SOLID', color: { r: 0.48, g: 0.5, b: 0.56 } }];
  v.appendChild(t1);
  v.appendChild(t2);
  left.appendChild(thumb);
  left.appendChild(v);
  const pr = figma.createText();
  pr.characters = price;
  pr.fontSize = 13;
  pr.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.14 } }];
  row.appendChild(left);
  row.appendChild(pr);
  return row;
}
page.appendChild(line('Pro workspace (annual)', '$228.00'));
page.appendChild(line('Brand kit add-on', '$48.00'));
const promo = createAutoLayout('HORIZONTAL');
promo.resize(408, 38);
promo.paddingLeft = 10;
promo.paddingRight = 10;
promo.cornerRadius = 9;
promo.counterAxisAlignItems = 'CENTER';
promo.itemSpacing = 10;
promo.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.98, b: 1 } }];
promo.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.94 } }];
promo.strokeWeight = 1;
const ph = figma.createText();
ph.characters = 'Gift or promo code';
ph.fontSize = 11;
ph.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.52, b: 0.58 } }];
const apply = figma.createRectangle();
apply.resize(64, 26);
apply.cornerRadius = 7;
apply.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.14, b: 0.2 } }];
promo.appendChild(ph);
promo.appendChild(apply);
page.appendChild(promo);
const math = createAutoLayout('VERTICAL');
math.resize(408, 92);
math.paddingTop = 10;
math.paddingLeft = 10;
math.paddingRight = 10;
math.paddingBottom = 10;
math.itemSpacing = 8;
math.cornerRadius = 10;
math.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
function rowAmt(label, val, bold) {
  const r = createAutoLayout('HORIZONTAL');
  r.resize(388, 18);
  r.primaryAxisAlignItems = 'SPACE_BETWEEN';
  const l = figma.createText();
  l.characters = label;
  l.fontSize = bold ? 13 : 11;
  l.fills = [{ type: 'SOLID', color: bold ? { r: 0.08, g: 0.09, b: 0.12 } : { r: 0.43, g: 0.45, b: 0.52 } }];
  const p = figma.createText();
  p.characters = val;
  p.fontSize = bold ? 13 : 11;
  p.fills = [{ type: 'SOLID', color: bold ? { r: 0.08, g: 0.09, b: 0.12 } : { r: 0.35, g: 0.37, b: 0.45 } }];
  r.appendChild(l);
  r.appendChild(p);
  return r;
}
math.appendChild(rowAmt('Subtotal', '$276.00', false));
math.appendChild(rowAmt('Estimated tax', '$22.04', false));
math.appendChild(rowAmt('Total', '$298.04', true));
page.appendChild(math);
const pay = createAutoLayout('HORIZONTAL');
pay.resize(408, 46);
pay.cornerRadius = 12;
pay.counterAxisAlignItems = 'CENTER';
pay.primaryAxisAlignItems = 'CENTER';
pay.fills = [{ type: 'SOLID', color: { r: 0.16, g: 0.46, b: 0.98 } }];
pay.effects = [{ type: 'DROP_SHADOW', color: { r: 0.1, g: 0.28, b: 0.8, a: 0.25 }, offset: { x: 0, y: 8 }, radius: 18, blendMode: 'NORMAL', visible: true }];
const payT = figma.createText();
payT.characters = 'Pay $298.04';
payT.fontSize = 15;
payT.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
pay.appendChild(payT);
page.appendChild(pay);
root.appendChild(page);
`,
  },
  {
    id: '104-profile-identity-card',
    title: 'Profile identity card',
    order: 104,
    tier: 'advanced',
    tags: ['composite', 'profile', 'effects'],
    needsFont: true,
    description:
      'Profile hero: soft gradient header, avatar with ring, handle block, stat trio, and tag chips over a white body card.\n\nExpected: layered portrait card with clear focus on name and stats.',
    body: `
const card = createAutoLayout('VERTICAL');
card.resize(400, 312);
card.x = 40;
card.y = 24;
card.cornerRadius = 18;
card.clipsContent = true;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.effects = [{ type: 'DROP_SHADOW', color: { r: 0.2, g: 0.25, b: 0.4, a: 0.14 }, offset: { x: 0, y: 10 }, radius: 22, blendMode: 'NORMAL', visible: true }];
const hero = figma.createRectangle();
hero.resize(400, 120);
hero.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.65, g: 0.78, b: 1, a: 1 } }, { position: 1, color: { r: 0.82, g: 0.7, b: 1, a: 1 } }], gradientTransform: [[1, 0, 0], [0, 1, 0]] }];
card.appendChild(hero);
const avatarWrap = figma.createFrame();
avatarWrap.resize(88, 88);
avatarWrap.x = 156;
avatarWrap.y = 76;
avatarWrap.fills = [];
const ring = figma.createEllipse();
ring.resize(88, 88);
ring.fills = [];
ring.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
ring.strokeWeight = 4;
const face = figma.createEllipse();
face.resize(72, 72);
face.x = 8;
face.y = 8;
face.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.72, b: 0.9 } }];
avatarWrap.appendChild(ring);
avatarWrap.appendChild(face);
card.appendChild(avatarWrap);
const body = createAutoLayout('VERTICAL');
body.resize(400, 200);
body.y = 164;
body.paddingTop = 20;
body.paddingLeft = 24;
body.paddingRight = 24;
body.itemSpacing = 12;
body.primaryAxisAlignItems = 'CENTER';
body.counterAxisAlignItems = 'CENTER';
const name = figma.createText();
name.characters = 'Mira Chen';
name.fontSize = 20;
name.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.08, b: 0.12 } }];
const handle = figma.createText();
handle.characters = '@mchen · Product Design';
handle.fontSize = 11;
handle.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.48, b: 0.55 } }];
body.appendChild(name);
body.appendChild(handle);
const stats = createAutoLayout('HORIZONTAL');
stats.itemSpacing = 18;
stats.paddingTop = 4;
function statBlock(n, lab) {
  const col = createAutoLayout('VERTICAL');
  col.itemSpacing = 2;
  col.primaryAxisAlignItems = 'CENTER';
  const nv = figma.createText();
  nv.characters = n;
  nv.fontSize = 16;
  nv.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.45, b: 0.9 } }];
  const lb = figma.createText();
  lb.characters = lab;
  lb.fontSize = 10;
  lb.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.52, b: 0.58 } }];
  col.appendChild(nv);
  col.appendChild(lb);
  return col;
}
stats.appendChild(statBlock('128', 'Projects'));
stats.appendChild(statBlock('14k', 'Followers'));
stats.appendChild(statBlock('96%', 'Response'));
body.appendChild(stats);
const chips = createAutoLayout('HORIZONTAL');
chips.itemSpacing = 8;
chips.paddingTop = 4;
function chip(txt) {
  const c = createAutoLayout('HORIZONTAL');
  c.paddingLeft = 10;
  c.paddingRight = 10;
  c.paddingTop = 5;
  c.paddingBottom = 5;
  c.cornerRadius = 14;
  c.counterAxisAlignItems = 'CENTER';
  c.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.99 } }];
  const t = figma.createText();
  t.characters = txt;
  t.fontSize = 10;
  t.fills = [{ type: 'SOLID', color: { r: 0.32, g: 0.35, b: 0.45 } }];
  c.appendChild(t);
  return c;
}
chips.appendChild(chip('Design systems'));
chips.appendChild(chip('Prototyping'));
chips.appendChild(chip('Tokyo'));
body.appendChild(chips);
card.appendChild(body);
root.appendChild(card);
`,
  },
  {
    id: '105-calendar-week-agenda',
    title: 'Calendar week agenda',
    order: 105,
    tier: 'advanced',
    tags: ['composite', 'calendar', 'autoLayout'],
    needsFont: true,
    description:
      'Week planner: day chips with today highlight, timed grid backdrop, and stacked event pills across the week.\n\nExpected: readable mini calendar with today emphasis.',
    body: `
const cal = createAutoLayout('VERTICAL');
cal.resize(440, 318);
cal.x = 20;
cal.y = 20;
cal.itemSpacing = 12;
const head = createAutoLayout('HORIZONTAL');
head.resize(440, 36);
head.primaryAxisAlignItems = 'SPACE_BETWEEN';
head.counterAxisAlignItems = 'CENTER';
const ht = figma.createText();
ht.characters = 'April 2026';
ht.fontSize = 17;
ht.fills = [{ type: 'SOLID', color: { r: 0.09, g: 0.1, b: 0.15 } }];
const dots = createAutoLayout('HORIZONTAL');
dots.itemSpacing = 6;
const d1 = figma.createRectangle();
d1.resize(8, 8);
d1.cornerRadius = 4;
d1.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.87, b: 0.92 } }];
const d2 = figma.createRectangle();
d2.resize(8, 8);
d2.cornerRadius = 4;
d2.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.87, b: 0.92 } }];
dots.appendChild(d1);
dots.appendChild(d2);
head.appendChild(ht);
head.appendChild(dots);
cal.appendChild(head);
const days = createAutoLayout('HORIZONTAL');
days.resize(440, 52);
days.itemSpacing = 8;
const dayMeta = [
  ['Mon', '13', false],
  ['Tue', '14', false],
  ['Wed', '15', true],
  ['Thu', '16', false],
  ['Fri', '17', false],
];
for (const [d, n, today] of dayMeta) {
  const cell = createAutoLayout('VERTICAL');
  cell.resize(76, 52);
  cell.paddingTop = 8;
  cell.paddingBottom = 8;
  cell.itemSpacing = 3;
  cell.cornerRadius = 12;
  cell.primaryAxisAlignItems = 'CENTER';
  cell.fills = [{ type: 'SOLID', color: today ? { r: 0.12, g: 0.36, b: 0.95 } : { r: 0.97, g: 0.98, b: 1 } }];
  cell.strokes = today ? [] : [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.94 } }];
  cell.strokeWeight = today ? 0 : 1;
  const d0 = figma.createText();
  d0.characters = d;
  d0.fontSize = 9;
  d0.fills = [{ type: 'SOLID', color: today ? { r: 1, g: 1, b: 1 } : { r: 0.45, g: 0.47, b: 0.55 } }];
  const d1t = figma.createText();
  d1t.characters = n;
  d1t.fontSize = 15;
  d1t.fills = [{ type: 'SOLID', color: today ? { r: 1, g: 1, b: 1 } : { r: 0.1, g: 0.11, b: 0.16 } }];
  cell.appendChild(d0);
  cell.appendChild(d1t);
  days.appendChild(cell);
}
cal.appendChild(days);
const board = figma.createFrame();
board.resize(440, 206);
board.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
board.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.91, b: 0.94 } }];
board.strokeWeight = 1;
board.cornerRadius = 14;
for (let g = 0; g < 4; g++) {
  const gl = figma.createLine();
  gl.resize(420, 0);
  gl.x = 10;
  gl.y = 20 + g * 48;
  gl.strokes = [{ type: 'SOLID', color: { r: 0.93, g: 0.94, b: 0.97 } }];
  gl.strokeWeight = 1;
  board.appendChild(gl);
}
function ev(x, y, w, c, title) {
  const f = figma.createFrame();
  f.resize(w, 34);
  f.x = x;
  f.y = y;
  f.cornerRadius = 8;
  f.fills = [{ type: 'SOLID', color: c }];
  const tx = figma.createText();
  tx.characters = title;
  tx.fontSize = 10;
  tx.x = 8;
  tx.y = 10;
  tx.fills = [{ type: 'SOLID', color: { r: 0.06, g: 0.08, b: 0.12 } }];
  f.appendChild(tx);
  board.appendChild(f);
}
ev(16, 26, 118, { r: 0.88, g: 0.94, b: 1 }, 'Design critique');
ev(148, 26, 100, { r: 0.92, g: 0.96, b: 0.9 }, 'Sprint plan');
ev(320, 34, 108, { r: 0.96, g: 0.9, b: 1 }, '1:1 w/ PM');
ev(96, 78, 132, { r: 1, g: 0.93, b: 0.86 }, 'Customer calls');
ev(248, 110, 124, { r: 0.93, g: 0.93, b: 1 }, 'Spec review');
cal.appendChild(board);
root.appendChild(cal);
`,
  },
  {
    id: '106-mail-split-inbox',
    title: 'Mail split inbox',
    order: 106,
    tier: 'advanced',
    tags: ['composite', 'mail', 'autoLayout'],
    needsFont: true,
    description:
      'Mailbox UI: left stacked message list with unread affordances and a rich reading pane with metadata and body copy.\n\nExpected: clear split view with emphasis on selected thread.',
    body: `
const split = createAutoLayout('HORIZONTAL');
split.resize(440, 312);
split.x = 20;
split.y = 24;
split.itemSpacing = 0;
const list = createAutoLayout('VERTICAL');
list.resize(188, 312);
list.paddingTop = 12;
list.paddingLeft = 10;
list.paddingRight = 10;
list.paddingBottom = 12;
list.itemSpacing = 8;
list.cornerRadius = 14;
list.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.98, b: 1 } }];
list.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.93 } }];
list.strokeWeight = 1;
function thread(sel, unread, who, sub, prev) {
  const row = createAutoLayout('HORIZONTAL');
  row.resize(168, 56);
  row.paddingLeft = 8;
  row.paddingRight = 8;
  row.paddingTop = 8;
  row.paddingBottom = 8;
  row.itemSpacing = 8;
  row.cornerRadius = 12;
  row.counterAxisAlignItems = 'CENTER';
  row.fills = sel ? [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] : [];
  row.effects = sel ? [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.08 }, offset: { x: 0, y: 4 }, radius: 10, blendMode: 'NORMAL', visible: true }] : [];
  if (sel) {
    row.strokes = [{ type: 'SOLID', color: { r: 0.2, g: 0.45, b: 0.95 } }];
    row.strokeWeight = 1;
  }
  const av = figma.createEllipse();
  av.resize(36, 36);
  av.fills = [{ type: 'SOLID', color: { r: 0.75, g: 0.82, b: 0.94 } }];
  const mid = createAutoLayout('VERTICAL');
  mid.resize(96, 40);
  mid.itemSpacing = 3;
  const w = figma.createText();
  w.characters = who;
  w.fontSize = 11;
  w.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.14, b: 0.2 } }];
  const s = figma.createText();
  s.characters = sub;
  s.fontSize = 10;
  s.fills = [{ type: 'SOLID', color: { r: 0.35, g: 0.38, b: 0.45 } }];
  const p = figma.createText();
  p.characters = prev;
  p.fontSize = 9;
  p.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.56, b: 0.62 } }];
  mid.appendChild(w);
  mid.appendChild(s);
  mid.appendChild(p);
  row.appendChild(av);
  row.appendChild(mid);
  if (unread) {
    const dot = figma.createEllipse();
    dot.resize(8, 8);
    dot.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45, b: 0.98 } }];
    row.appendChild(dot);
  }
  return row;
}
list.appendChild(thread(true, false, 'Sasha', 'Re: Launch checklist', 'Let us lock assets by Friday'));
list.appendChild(thread(false, true, 'Finance bot', 'Invoice #4421', 'Payment scheduled'));
list.appendChild(thread(false, true, 'Ops', 'Latency report', 'p95 down to 180ms'));
split.appendChild(list);
const reader = createAutoLayout('VERTICAL');
reader.resize(252, 312);
reader.paddingTop = 16;
reader.paddingLeft = 16;
reader.paddingRight = 16;
reader.paddingBottom = 16;
reader.itemSpacing = 12;
reader.cornerRadius = 14;
reader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
reader.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.93 } }];
reader.strokeWeight = 1;
const meta = createAutoLayout('HORIZONTAL');
meta.resize(220, 40);
meta.primaryAxisAlignItems = 'SPACE_BETWEEN';
meta.counterAxisAlignItems = 'CENTER';
const who2 = figma.createText();
who2.characters = 'Sasha Ibrahim';
who2.fontSize = 14;
who2.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.09, b: 0.14 } }];
const when = figma.createText();
when.characters = 'Today · 9:42 AM';
when.fontSize = 10;
when.fills = [{ type: 'SOLID', color: { r: 0.48, g: 0.5, b: 0.56 } }];
meta.appendChild(who2);
meta.appendChild(when);
reader.appendChild(meta);
const subj = figma.createText();
subj.characters = 'Re: Launch checklist — assets + QA';
subj.fontSize = 15;
subj.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.14, b: 0.2 } }];
reader.appendChild(subj);
const p1 = figma.createText();
p1.characters = 'Hey team — pushing the hero swaps tonight. Need sign-off on tokens before we cut RC2.';
p1.fontSize = 11;
p1.fills = [{ type: 'SOLID', color: { r: 0.28, g: 0.3, b: 0.36 } }];
const p2 = figma.createText();
p2.characters = 'Can someone snapshot the dashboard dark mode regression pack? I will attach figures in thread.';
p2.fontSize = 11;
p2.fills = [{ type: 'SOLID', color: { r: 0.28, g: 0.3, b: 0.36 } }];
reader.appendChild(p1);
reader.appendChild(p2);
const actions = createAutoLayout('HORIZONTAL');
actions.itemSpacing = 10;
const reply = figma.createRectangle();
reply.resize(76, 30);
reply.cornerRadius = 8;
reply.fills = [{ type: 'SOLID', color: { r: 0.14, g: 0.38, b: 0.95 } }];
const fwd = figma.createRectangle();
fwd.resize(76, 30);
fwd.cornerRadius = 8;
fwd.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
fwd.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.88, b: 0.92 } }];
fwd.strokeWeight = 1;
actions.appendChild(reply);
actions.appendChild(fwd);
reader.appendChild(actions);
split.appendChild(reader);
root.appendChild(split);
`,
  },
  {
    id: '107-pricing-tier-cards',
    title: 'Pricing tier cards',
    order: 107,
    tier: 'advanced',
    tags: ['composite', 'pricing', 'autoLayout'],
    needsFont: true,
    description:
      'Three-column pricing: starter and growth flanking a visually lifted Pro tier with richer shadow, plus feature bullets as icon rows.\n\nExpected: middle column reads as featured plan.',
    body: `
const deck = createAutoLayout('HORIZONTAL');
deck.resize(448, 310);
deck.x = 16;
deck.y = 26;
deck.itemSpacing = 10;
deck.counterAxisAlignItems = 'MAX';
function tier(name, price, blurb, feat, featured) {
  const col = createAutoLayout('VERTICAL');
  col.resize(142, featured ? 310 : 286);
  col.paddingTop = 16;
  col.paddingLeft = 12;
  col.paddingRight = 12;
  col.paddingBottom = 16;
  col.itemSpacing = 10;
  col.cornerRadius = 16;
  col.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  col.strokes = [{ type: 'SOLID', color: featured ? { r: 0.18, g: 0.48, b: 1 } : { r: 0.9, g: 0.91, b: 0.95 } }];
  col.strokeWeight = featured ? 2 : 1;
  col.effects = featured
    ? [{ type: 'DROP_SHADOW', color: { r: 0.1, g: 0.2, b: 0.45, a: 0.22 }, offset: { x: 0, y: 14 }, radius: 28, blendMode: 'NORMAL', visible: true }]
    : [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 6 }, radius: 14, blendMode: 'NORMAL', visible: true }];
  const star = figma.createText();
  star.characters = name;
  star.fontSize = 13;
  star.fills = [{ type: 'SOLID', color: featured ? { r: 0.14, g: 0.42, b: 0.98 } : { r: 0.2, g: 0.22, b: 0.28 } }];
  const money = figma.createText();
  money.characters = price;
  money.fontSize = 22;
  money.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.09, b: 0.14 } }];
  const bd = figma.createText();
  bd.characters = blurb;
  bd.fontSize = 10;
  bd.fills = [{ type: 'SOLID', color: { r: 0.48, g: 0.5, b: 0.56 } }];
  col.appendChild(star);
  col.appendChild(money);
  col.appendChild(bd);
  const rule = figma.createRectangle();
  rule.resize(118, 1);
  rule.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
  col.appendChild(rule);
  for (const line of feat) {
    const row = createAutoLayout('HORIZONTAL');
    row.itemSpacing = 8;
    row.counterAxisAlignItems = 'CENTER';
    const ic = figma.createRectangle();
    ic.resize(14, 14);
    ic.cornerRadius = 7;
    ic.fills = [{ type: 'SOLID', color: { r: 0.78, g: 0.95, b: 0.85 } }];
    const tx = figma.createText();
    tx.characters = line;
    tx.fontSize = 10;
    tx.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.27, b: 0.34 } }];
    row.appendChild(ic);
    row.appendChild(tx);
    col.appendChild(row);
  }
  const cta = figma.createRectangle();
  cta.resize(118, 34);
  cta.cornerRadius = 10;
  cta.fills = [{ type: 'SOLID', color: featured ? { r: 0.14, g: 0.42, b: 0.98 } : { r: 0.96, g: 0.97, b: 1 } }];
  if (!featured) {
    cta.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.87, b: 0.92 } }];
    cta.strokeWeight = 1;
  }
  col.appendChild(cta);
  return col;
}
deck.appendChild(tier('Starter', '$0', 'Prototype solo', ['Unlimited drafts', 'Email support'], false));
deck.appendChild(tier('Pro', '$49', 'For shipping teams', ['Insights + SSO', 'Shared libraries'], true));
deck.appendChild(tier('Scale', '$149', 'Compliance ready', ['Audit logs', 'SAML'], false));
root.appendChild(deck);
`,
  },
  {
    id: '108-files-browser-panel',
    title: 'Files browser panel',
    order: 108,
    tier: 'advanced',
    tags: ['composite', 'files', 'autoLayout'],
    needsFont: true,
    description:
      'Finder-style sheet: chrome toolbar with breadcrumbs, quick action chips, folder shortcuts, and dense file rows with type pills.\n\nExpected: navigational clarity with muted panel chrome.',
    body: `
const panel = createAutoLayout('VERTICAL');
panel.resize(424, 322);
panel.x = 28;
panel.y = 18;
panel.itemSpacing = 10;
panel.cornerRadius = 16;
panel.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.995 } }];
panel.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.93 } }];
panel.strokeWeight = 1;
panel.paddingTop = 12;
panel.paddingLeft = 12;
panel.paddingRight = 12;
panel.paddingBottom = 12;
const toolbar = createAutoLayout('HORIZONTAL');
toolbar.resize(400, 40);
toolbar.primaryAxisAlignItems = 'SPACE_BETWEEN';
toolbar.counterAxisAlignItems = 'CENTER';
const crumbs = figma.createText();
crumbs.characters = 'Team drive  /  Product  /  Research';
crumbs.fontSize = 12;
crumbs.fills = [{ type: 'SOLID', color: { r: 0.18, g: 0.2, b: 0.26 } }];
const icons = createAutoLayout('HORIZONTAL');
icons.itemSpacing = 8;
for (let i = 0; i < 3; i++) {
  const sq = figma.createRectangle();
  sq.resize(28, 28);
  sq.cornerRadius = 8;
  sq.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  sq.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.93 } }];
  sq.strokeWeight = 1;
  icons.appendChild(sq);
}
toolbar.appendChild(crumbs);
toolbar.appendChild(icons);
panel.appendChild(toolbar);
const quick = createAutoLayout('HORIZONTAL');
quick.itemSpacing = 8;
function qchip(l) {
  const c = createAutoLayout('HORIZONTAL');
  c.paddingLeft = 10;
  c.paddingRight = 10;
  c.paddingTop = 6;
  c.paddingBottom = 6;
  c.cornerRadius = 12;
  c.counterAxisAlignItems = 'CENTER';
  c.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  const t = figma.createText();
  t.characters = l;
  t.fontSize = 10;
  t.fills = [{ type: 'SOLID', color: { r: 0.35, g: 0.38, b: 0.46 } }];
  c.appendChild(t);
  return c;
}
quick.appendChild(qchip('Shared with me'));
quick.appendChild(qchip('Recent'));
quick.appendChild(qchip('Starred'));
panel.appendChild(quick);
const folderStrip = createAutoLayout('HORIZONTAL');
folderStrip.itemSpacing = 10;
for (let i = 0; i < 3; i++) {
  const fd = createAutoLayout('VERTICAL');
  fd.resize(80, 72);
  fd.paddingTop = 8;
  fd.primaryAxisAlignItems = 'CENTER';
  fd.itemSpacing = 6;
  fd.cornerRadius = 12;
  fd.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  const icon = figma.createRectangle();
  icon.resize(36, 28);
  icon.cornerRadius = 6;
  icon.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.78, b: 0.42, a: 1 } }];
  const nm = figma.createText();
  nm.characters = i === 0 ? 'Interviews' : i === 1 ? 'Insights' : 'Archive';
  nm.fontSize = 9;
  nm.fills = [{ type: 'SOLID', color: { r: 0.32, g: 0.34, b: 0.4 } }];
  fd.appendChild(icon);
  fd.appendChild(nm);
  folderStrip.appendChild(fd);
}
panel.appendChild(folderStrip);
const list = createAutoLayout('VERTICAL');
list.resize(400, 152);
list.itemSpacing = 6;
list.cornerRadius = 12;
list.paddingTop = 8;
list.paddingLeft = 8;
list.paddingRight = 8;
list.paddingBottom = 8;
list.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
function fileRow(nm, typ, tint) {
  const r = createAutoLayout('HORIZONTAL');
  r.resize(384, 36);
  r.paddingLeft = 8;
  r.paddingRight = 8;
  r.cornerRadius = 9;
  r.primaryAxisAlignItems = 'SPACE_BETWEEN';
  r.counterAxisAlignItems = 'CENTER';
  r.fills = [{ type: 'SOLID', color: { r: 0.99, g: 0.995, b: 1 } }];
  const left = createAutoLayout('HORIZONTAL');
  left.itemSpacing = 8;
  left.counterAxisAlignItems = 'CENTER';
  const ic = figma.createRectangle();
  ic.resize(22, 22);
  ic.cornerRadius = 6;
  ic.fills = [{ type: 'SOLID', color: tint }];
  const t = figma.createText();
  t.characters = nm;
  t.fontSize = 11;
  t.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.16, b: 0.22 } }];
  left.appendChild(ic);
  left.appendChild(t);
  const pill = createAutoLayout('HORIZONTAL');
  pill.paddingLeft = 8;
  pill.paddingRight = 8;
  pill.paddingTop = 4;
  pill.paddingBottom = 4;
  pill.cornerRadius = 10;
  pill.counterAxisAlignItems = 'CENTER';
  pill.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.99 } }];
  const pt = figma.createText();
  pt.characters = typ;
  pt.fontSize = 9;
  pt.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.42, b: 0.5 } }];
  pill.appendChild(pt);
  r.appendChild(left);
  r.appendChild(pill);
  return r;
}
list.appendChild(fileRow('Vision deck.fig', 'Design', { r: 0.85, g: 0.9, b: 1 }));
list.appendChild(fileRow('Research-rollups.csv', 'Sheet', { r: 0.88, g: 0.96, b: 0.9 }));
list.appendChild(fileRow('Playback-notes.md', 'Doc', { r: 0.94, g: 0.92, b: 1 }));
panel.appendChild(list);
root.appendChild(panel);
`,
  },
  {
    id: '109-onboarding-step-wizard',
    title: 'Onboarding step wizard',
    order: 109,
    tier: 'advanced',
    tags: ['composite', 'onboarding', 'autoLayout'],
    needsFont: true,
    description:
      'Three-step onboarding: numbered stepper, illustration tile, value props, and dual CTA row (primary + quiet).\n\nExpected: guided flow focal point on step 2 of 3.',
    body: `
const flow = createAutoLayout('VERTICAL');
flow.resize(400, 318);
flow.x = 40;
flow.y = 20;
flow.itemSpacing = 18;
flow.primaryAxisAlignItems = 'CENTER';
flow.counterAxisAlignItems = 'CENTER';
const stepper = createAutoLayout('HORIZONTAL');
stepper.itemSpacing = 16;
stepper.counterAxisAlignItems = 'CENTER';
function step(n, label, active, done) {
  const col = createAutoLayout('VERTICAL');
  col.itemSpacing = 6;
  col.primaryAxisAlignItems = 'CENTER';
  const disc = createAutoLayout('VERTICAL');
  disc.resize(36, 36);
  disc.cornerRadius = 18;
  disc.primaryAxisAlignItems = 'CENTER';
  disc.counterAxisAlignItems = 'CENTER';
  disc.fills = [{ type: 'SOLID', color: active ? { r: 0.14, g: 0.42, b: 0.98 } : done ? { r: 0.22, g: 0.72, b: 0.48 } : { r: 0.9, g: 0.91, b: 0.94 } }];
  const txt = figma.createText();
  txt.characters = String(n);
  txt.fontSize = 14;
  txt.fills = [{ type: 'SOLID', color: active || done ? { r: 1, g: 1, b: 1 } : { r: 0.45, g: 0.46, b: 0.52 } }];
  disc.appendChild(txt);
  const lb = figma.createText();
  lb.characters = label;
  lb.fontSize = 9;
  lb.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.42, b: 0.5 } }];
  col.appendChild(disc);
  col.appendChild(lb);
  return col;
}
stepper.appendChild(step(1, 'Workspace', false, true));
stepper.appendChild(step(2, 'Invite', true, false));
stepper.appendChild(step(3, 'Ship', false, false));
flow.appendChild(stepper);
const illo = figma.createFrame();
illo.resize(360, 140);
illo.cornerRadius = 18;
illo.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.93, g: 0.95, b: 1, a: 1 } }, { position: 1, color: { r: 0.88, g: 0.9, b: 1, a: 1 } }], gradientTransform: [[1, 0, 0], [0, 1, 0]] }];
illo.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.88, b: 0.93 } }];
illo.strokeWeight = 1;
const deco1 = figma.createRectangle();
deco1.resize(120, 12);
deco1.x = 40;
deco1.y = 40;
deco1.cornerRadius = 6;
deco1.fills = [{ type: 'SOLID', color: { r: 0.78, g: 0.84, b: 0.98 } }];
const deco2 = figma.createRectangle();
deco2.resize(180, 12);
deco2.x = 40;
deco2.y = 62;
deco2.cornerRadius = 6;
deco2.fills = [{ type: 'SOLID', color: { r: 0.86, g: 0.9, b: 0.99 } }];
const deco3 = figma.createRectangle();
deco3.resize(90, 90);
deco3.x = 230;
deco3.y = 34;
deco3.cornerRadius = 22;
deco3.fills = [{ type: 'SOLID', color: { r: 0.72, g: 0.82, b: 1, a: 0.55 } }];
illo.appendChild(deco1);
illo.appendChild(deco2);
illo.appendChild(deco3);
flow.appendChild(illo);
const title = figma.createText();
title.characters = 'Bring your collaborators';
title.fontSize = 20;
title.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.08, b: 0.12 } }];
flow.appendChild(title);
const bullets = createAutoLayout('VERTICAL');
bullets.itemSpacing = 8;
for (const line of ['Guests preview without seats', 'Granular library permissions', 'Activity log in Scale tier']) {
  const row = createAutoLayout('HORIZONTAL');
  row.itemSpacing = 8;
  row.counterAxisAlignItems = 'CENTER';
  const dot = figma.createRectangle();
  dot.resize(6, 6);
  dot.cornerRadius = 3;
  dot.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45, b: 0.98 } }];
  const t = figma.createText();
  t.characters = line;
  t.fontSize = 11;
  t.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.32, b: 0.38 } }];
  row.appendChild(dot);
  row.appendChild(t);
  bullets.appendChild(row);
}
flow.appendChild(bullets);
const ctas = createAutoLayout('HORIZONTAL');
ctas.itemSpacing = 12;
const prim = figma.createRectangle();
prim.resize(140, 40);
prim.cornerRadius = 12;
prim.fills = [{ type: 'SOLID', color: { r: 0.14, g: 0.42, b: 0.98 } }];
const sec = figma.createRectangle();
sec.resize(120, 40);
sec.cornerRadius = 12;
sec.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.97, b: 1 } }];
sec.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.87, b: 0.92 } }];
sec.strokeWeight = 1;
ctas.appendChild(prim);
ctas.appendChild(sec);
flow.appendChild(ctas);
root.appendChild(flow);
`,
  },
  {
    id: '110-roadmap-timeline-rail',
    title: 'Roadmap timeline rail',
    order: 110,
    tier: 'advanced',
    tags: ['composite', 'roadmap', 'layout'],
    needsFont: true,
    description:
      'Product roadmap: horizontal baseline with milestone nodes, dated captions, and stacked initiative cards with owners.\n\nExpected: timeline reads left-to-right with anchored nodes.',
    body: `
const canvas = figma.createFrame();
canvas.resize(440, 292);
canvas.x = 20;
canvas.y = 34;
canvas.fills = [];
const heading = figma.createText();
heading.characters = 'FY26 delivery preview';
heading.fontSize = 16;
heading.x = 20;
heading.y = 0;
heading.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.1, b: 0.15 } }];
canvas.appendChild(heading);
const rail = figma.createRectangle();
rail.resize(400, 4);
rail.x = 20;
rail.y = 46;
rail.cornerRadius = 2;
rail.fills = [{ type: 'SOLID', color: { r: 0.86, g: 0.88, b: 0.94 } }];
canvas.appendChild(rail);
function milestone(x, label, caption, cardTitle, owner, tint) {
  const node = figma.createEllipse();
  node.resize(18, 18);
  node.x = x;
  node.y = 39;
  node.fills = [{ type: 'SOLID', color: { r: 0.14, g: 0.42, b: 0.98 } }];
  node.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  node.strokeWeight = 3;
  canvas.appendChild(node);
  const lb = figma.createText();
  lb.characters = label;
  lb.fontSize = 10;
  lb.fills = [{ type: 'SOLID', color: { r: 0.32, g: 0.34, b: 0.42 } }];
  lb.x = x - 18;
  lb.y = 12;
  canvas.appendChild(lb);
  const cap = figma.createText();
  cap.characters = caption;
  cap.fontSize = 11;
  cap.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.14, b: 0.2 } }];
  cap.x = x - 28;
  cap.y = 70;
  canvas.appendChild(cap);
  const card = figma.createFrame();
  card.resize(128, 88);
  card.x = x - 54;
  card.y = 96;
  card.cornerRadius = 12;
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 6 }, radius: 14, blendMode: 'NORMAL', visible: true }];
  card.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.91, b: 0.95 } }];
  card.strokeWeight = 1;
  const band = figma.createRectangle();
  band.resize(128, 6);
  band.cornerRadius = 12;
  band.fills = [{ type: 'SOLID', color: tint }];
  card.appendChild(band);
  const ct = figma.createText();
  ct.characters = cardTitle;
  ct.fontSize = 11;
  ct.x = 10;
  ct.y = 16;
  ct.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.11, b: 0.14 } }];
  const ow = figma.createText();
  ow.characters = owner;
  ow.fontSize = 9;
  ow.x = 10;
  ow.y = 52;
  ow.fills = [{ type: 'SOLID', color: { r: 0.45, g: 0.47, b: 0.54 } }];
  card.appendChild(ct);
  card.appendChild(ow);
  canvas.appendChild(card);
}
milestone(64, 'Q1', 'Feb', 'Design parity', 'Team Tokens', { r: 0.78, g: 0.88, b: 1 });
milestone(198, 'Q2', 'May', 'API hardening', 'Platform', { r: 0.88, g: 0.95, b: 0.86 });
milestone(332, 'Q3', 'Aug', 'Enterprise GA', 'GTM', { r: 0.95, g: 0.88, b: 1 });
root.appendChild(canvas);
`,
  },
];

/** MCP-only on Figma Desktop; shim uses createFrame + layoutMode for local-figma-mcp. */
const AUTO_LAYOUT_SHIM = `function createAutoLayout(direction) {
  if (typeof figma.createAutoLayout === 'function') {
    return figma.createAutoLayout(direction);
  }
  const frame = figma.createFrame();
  frame.layoutMode = direction === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
  return frame;
}`;

function buildScript(s) {
  const fontLine = s.needsFont
    ? "await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });\n"
    : '';
  const body = s.body.trim().replace(/figma\.createAutoLayout/g, 'createAutoLayout');
  return `${fontLine}${AUTO_LAYOUT_SHIM}
const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
${body}
return { rootId: root.id };
`;
}

mkdirSync(SCENARIOS_DIR, { recursive: true });
mkdirSync(join(ROOT, 'assets'), { recursive: true });

for (const s of SCENARIOS) {
  const dir = join(SCENARIOS_DIR, s.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'script.js'), buildScript(s), 'utf8');
  writeFileSync(join(dir, 'description.txt'), s.description.trim() + '\n', 'utf8');
}

const manifest = {
  version: 1,
  viewport: { width: 480, height: 360 },
  scenarios: SCENARIOS.map((s) => ({
    id: s.id,
    title: s.title,
    order: s.order,
    tier: s.tier,
    tags: s.tags,
    ...(s.figjamOnly ? { figjamOnly: true } : {}),
  })),
};

writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
writeFileSync(join(ROOT, 'assets', 'sample.png'), MINIMAL_PNG);

console.log(`Generated ${SCENARIOS.length} scenarios in ${SCENARIOS_DIR}`);
