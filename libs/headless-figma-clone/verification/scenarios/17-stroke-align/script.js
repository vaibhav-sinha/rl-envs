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
rect.resize(200, 120);
rect.x = 140;
rect.y = 120;
rect.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.9, b: 0.95 } }];
rect.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
rect.strokeWeight = 8;
rect.strokeAlign = 'INSIDE';
root.appendChild(rect);
return { rootId: root.id };
