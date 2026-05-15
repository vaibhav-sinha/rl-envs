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
return { rootId: root.id };
