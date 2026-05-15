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
const row = createAutoLayout();
row.resize(300, 80);
row.x = 90;
row.y = 140;
const a = figma.createRectangle();
a.resize(60, 40);
a.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
row.appendChild(a);
const badge = figma.createEllipse();
badge.resize(32, 32);
badge.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.2, b: 0.2 } }];
row.appendChild(badge);
badge.layoutPositioning = 'ABSOLUTE';
badge.x = 250;
badge.y = 8;
root.appendChild(row);
return { rootId: root.id };
