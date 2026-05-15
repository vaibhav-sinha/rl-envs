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
root.layoutGrids = [{
  pattern: 'COLUMNS',
  alignment: 'MIN',
  sectionSize: 60,
  gutterSize: 12,
  count: 6,
  offset: 0,
  color: { r: 0, g: 0.3, b: 0.8, a: 0.12 },
}];
const nav = createAutoLayout();
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
return { rootId: root.id };
