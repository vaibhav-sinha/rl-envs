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
const rect = figma.createRectangle();
rect.resize(220, 100);
rect.x = 130;
rect.y = 130;
rect.cornerRadius = 24;
rect.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.55, b: 0.95 } }];
root.appendChild(rect);
return { rootId: root.id };
