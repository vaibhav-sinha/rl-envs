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
return { rootId: root.id };
