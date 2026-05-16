await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
function createAutoLayout(direction) {
  if (typeof figma.createAutoLayout === 'function') {
    return figma.createAutoLayout(direction);
  }
  const frame = figma.createFrame();
  frame.layoutMode = direction === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
  return frame;
}
const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
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
return { rootId: root.id };
