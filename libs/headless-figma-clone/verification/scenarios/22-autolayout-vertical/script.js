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
col.counterAxisAlignItems = 'CENTER';
col.itemSpacing = 10;
col.resize(200, 200);
col.x = 140;
col.y = 80;
col.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
col.paddingTop = 16;
col.paddingBottom = 16;
for (let i = 0; i < 3; i++) {
  const box = figma.createRectangle();
  box.resize(120, 36);
  box.fills = [{ type: 'SOLID', color: { r: 0.3 + i * 0.2, g: 0.4, b: 0.8 } }];
  col.appendChild(box);
}
root.appendChild(col);
return { rootId: root.id };
