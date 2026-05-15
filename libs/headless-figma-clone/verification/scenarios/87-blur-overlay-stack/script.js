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
blur.effects = [{ type: 'BACKDROP_BLUR', radius: 16, visible: true }];
root.appendChild(blur);
const veil = figma.createRectangle();
veil.resize(300, 140);
veil.x = 90;
veil.y = 110;
veil.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.5 } }];
root.appendChild(veil);
return { rootId: root.id };
