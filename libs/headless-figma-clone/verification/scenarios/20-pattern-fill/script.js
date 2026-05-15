const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const rect = figma.createRectangle();
rect.resize(280, 180);
rect.x = 100;
rect.y = 90;
rect.fills = [{
  type: 'PATTERN',
  sourceNodeId: null,
  tileType: 'RECTANGULAR',
  scalingFactor: 1,
  spacing: { x: 8, y: 8 },
  horizontalAlignment: 'START',
  verticalAlignment: 'START',
}];
root.appendChild(rect);
return { rootId: root.id };
