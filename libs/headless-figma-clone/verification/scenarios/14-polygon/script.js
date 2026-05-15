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
const poly = figma.createPolygon();
poly.pointCount = 6;
poly.resize(160, 160);
poly.x = 160;
poly.y = 100;
poly.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.2, b: 0.8 } }];
root.appendChild(poly);
return { rootId: root.id };
