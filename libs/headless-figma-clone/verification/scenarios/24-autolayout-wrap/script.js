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
row.resize(320, 120);
row.x = 80;
row.y = 120;
row.layoutWrap = 'WRAP';
row.itemSpacing = 8;
row.counterAxisSpacing = 8;
for (let i = 0; i < 8; i++) {
  const chip = figma.createRectangle();
  chip.resize(64, 28);
  chip.fills = [{ type: 'SOLID', color: { r: 0.2 + (i % 3) * 0.25, g: 0.5, b: 0.85 } }];
  row.appendChild(chip);
}
root.appendChild(row);
return { rootId: root.id };
