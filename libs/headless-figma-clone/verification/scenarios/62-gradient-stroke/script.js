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
return { rootId: root.id };
