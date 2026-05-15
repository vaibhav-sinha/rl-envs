const tile = figma.createEllipse();
tile.resize(16, 16);
tile.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.95 } }];
tile.x = -200;
tile.y = -200;
figma.currentPage.appendChild(tile);
const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const rect = figma.createRectangle();
rect.resize(280, 180);
rect.x = 100;
rect.y = 90;
root.appendChild(rect);
await rect.setFillsAsync([
  {
    type: 'PATTERN',
    sourceNodeId: tile.id,
    tileType: 'RECTANGULAR',
    scalingFactor: 1,
    spacing: { x: 0.5, y: 0.5 },
    horizontalAlignment: 'START',
    verticalAlignment: 'START',
  },
]);
return { rootId: root.id };
