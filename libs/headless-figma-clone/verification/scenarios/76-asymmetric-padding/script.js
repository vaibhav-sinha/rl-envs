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
row.x = 120;
row.y = 100;
row.paddingLeft = 8;
row.paddingTop = 48;
row.paddingRight = 64;
row.paddingBottom = 16;
row.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.95 } }];
const child = figma.createRectangle();
child.resize(120, 40);
child.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.55, b: 0.9 } }];
row.appendChild(child);
root.appendChild(row);
return { rootId: root.id };
