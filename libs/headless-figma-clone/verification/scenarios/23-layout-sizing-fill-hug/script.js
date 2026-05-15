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
row.resize(360, 48);
row.x = 60;
row.y = 156;
row.itemSpacing = 8;
const fill = figma.createRectangle();
fill.name = 'Fill';
fill.resize(80, 40);
fill.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
const narrow = figma.createRectangle();
narrow.name = 'Narrow';
narrow.resize(50, 40);
narrow.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.55, b: 0.1 } }];
root.appendChild(row);
row.appendChild(fill);
fill.layoutSizingHorizontal = 'FILL';
row.appendChild(narrow);
return { rootId: root.id };
