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
const col = figma.variables.createVariableCollection('Layout');
const modeId = col.modes[0].modeId;
const gap = figma.variables.createVariable('gap', col, 'FLOAT');
gap.setValueForMode(modeId, 32);
const row = createAutoLayout();
row.resize(320, 48);
row.x = 80;
row.y = 156;
for (let i = 0; i < 2; i++) {
  const box = figma.createRectangle();
  box.resize(80, 36);
  box.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.85 } }];
  row.appendChild(box);
}
root.appendChild(row);
row.setBoundVariable('itemSpacing', gap);
return { rootId: root.id };
