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
row.resize(400, 56);
row.x = 40;
row.y = 150;
const child = figma.createRectangle();
child.resize(200, 40);
child.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.3, b: 0.85 } }];
row.appendChild(child);
child.minWidth = 80;
child.maxWidth = 160;
child.layoutSizingHorizontal = 'FILL';
root.appendChild(row);
return { rootId: root.id };
