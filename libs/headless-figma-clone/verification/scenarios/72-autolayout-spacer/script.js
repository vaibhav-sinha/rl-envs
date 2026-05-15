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
row.resize(400, 48);
row.x = 40;
row.y = 156;
row.itemSpacing = 0;
const left = figma.createRectangle();
left.resize(80, 40);
left.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.9 } }];
const spacer = figma.createRectangle();
spacer.resize(24, 40);
spacer.fills = [{ type: 'SOLID', color: { r: 0.75, g: 0.77, b: 0.82 } }];
const right = figma.createRectangle();
right.resize(80, 40);
right.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
root.appendChild(row);
row.appendChild(left);
left.layoutSizingHorizontal = 'FILL';
row.appendChild(spacer);
row.appendChild(right);
right.layoutSizingHorizontal = 'FILL';
return { rootId: root.id };
