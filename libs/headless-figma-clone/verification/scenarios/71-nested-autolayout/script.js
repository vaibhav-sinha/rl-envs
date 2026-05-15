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
col.itemSpacing = 12;
col.x = 120;
col.y = 80;
col.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
col.paddingTop = 16;
col.paddingLeft = 16;
const row = createAutoLayout();
row.itemSpacing = 8;
for (let i = 0; i < 4; i++) {
  const chip = figma.createRectangle();
  chip.resize(56, 28);
  chip.fills = [{ type: 'SOLID', color: { r: 0.2 + (i % 2) * 0.3, g: 0.5, b: 0.85 } }];
  row.appendChild(chip);
}
col.appendChild(row);
root.appendChild(col);
return { rootId: root.id };
