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
row.appendChild(fill);
fill.layoutSizingHorizontal = 'FILL';
row.appendChild(narrow);
root.appendChild(row);
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
row.appendChild(child);
child.minWidth = 80;
child.maxWidth = 160;
child.layoutSizingHorizontal = 'FILL';
root.appendChild(row);
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
root.layoutGrids = [{ pattern: 'COLUMNS', sectionSize: 60, gutterSize: 12, color: { r: 0, g: 0.3, b: 0.8, a: 0.12 } }];
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
    description: 'Column containing row of chips.\n\nExpected: 2x2-ish chip grid layout.',
    body: `
const col = figma.createFrame();
col.layoutMode = 'VERTICAL';
col.itemSpacing = 12;
col.x = 120;
col.y = 80;
col.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
col.paddingTop = 16;
col.paddingLeft = 16;
const row = figma.createAutoLayout();
row.itemSpacing = 8;
for (let i = 0; i < 4; i++) {
  const chip = figma.createRectangle();
  chip.resize(56, 28);
  chip.fills = [{ type: 'SOLID', color: { r: 0.2 + (i % 2) * 0.3, g: 0.5, b: 0.85 } }];
  row.appendChild(chip);
}
col.appendChild(row);
root.appendChild(col);
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
row.appendChild(left);
left.layoutSizingHorizontal = 'FILL';
row.appendChild(spacer);
row.appendChild(right);
right.layoutSizingHorizontal = 'FILL';
root.appendChild(row);
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
    description: 'STRETCH on vertical stack.\n\nExpected: children full width of column.',
    body: `
const col = figma.createFrame();
col.layoutMode = 'VERTICAL';
col.counterAxisAlignItems = 'STRETCH';
col.itemSpacing = 8;
col.resize(200, 180);
col.x = 140;
col.y = 90;
col.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
col.paddingLeft = 12;
col.paddingRight = 12;
for (let i = 0; i < 3; i++) {
  const box = figma.createRectangle();
  box.resize(100, 32);
  box.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45 + i * 0.15, b: 0.85 } }];
  col.appendChild(box);
}
root.appendChild(col);
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
child.constraints = { horizontal: 'CENTER', vertical: 'TOP_BOTTOM' };
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
frame.layoutGrids = [{ pattern: 'COLUMNS', sectionSize: 80, gutterSize: 12, color: { r: 0, g: 0.3, b: 0.8, a: 0.12 } }];
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
gridStyle.layoutGrids = [{ pattern: 'COLUMNS', sectionSize: 48, gutterSize: 8, color: { r: 0, g: 0.4, b: 0.7, a: 0.18 } }];
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
    id: '99-pricing-table-composite',
    title: 'Pricing table composite',
    order: 99,
    tier: 'advanced',
    figjamOnly: true,
    tags: ['composite', 'table', 'variables'],
    needsFont: true,
    description: 'Table + header + variable prices.\n\nExpected: pricing grid with striped rows and bound price text.',
    body: `
const col = figma.variables.createVariableCollection('Pricing');
const modeId = col.modes[0].modeId;
const price = figma.variables.createVariable('price', col, 'STRING');
price.setValueForMode(modeId, '$19');
const title = figma.createText();
title.characters = 'Plans';
title.fontSize = 20;
title.x = 200;
title.y = 24;
root.appendChild(title);
const table = figma.createTable(3, 2);
table.x = 80;
table.y = 60;
table.resize(320, 160);
root.appendChild(table);
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
