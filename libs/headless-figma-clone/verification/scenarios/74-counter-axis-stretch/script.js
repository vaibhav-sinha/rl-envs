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
const col = figma.createFrame();
col.layoutMode = 'VERTICAL';
col.itemSpacing = 8;
col.resize(200, 180);
col.x = 140;
col.y = 90;
col.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
col.paddingLeft = 12;
col.paddingRight = 12;
root.appendChild(col);
for (let i = 0; i < 3; i++) {
  const box = figma.createRectangle();
  box.resize(100, 32);
  box.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45 + i * 0.15, b: 0.85 } }];
  col.appendChild(box);
  box.layoutSizingHorizontal = 'FILL';
}
return { rootId: root.id };
