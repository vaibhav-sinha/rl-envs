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
row.resize(360, 56);
row.x = 60;
row.y = 150;
row.itemSpacing = 12;
const a = figma.createRectangle();
a.resize(60, 40);
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.25 } }];
const b = figma.createRectangle();
b.resize(60, 40);
b.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.9 } }];
row.appendChild(a);
a.layoutGrow = 1;
row.appendChild(b);
b.layoutGrow = 1;
root.appendChild(row);
return { rootId: root.id };
