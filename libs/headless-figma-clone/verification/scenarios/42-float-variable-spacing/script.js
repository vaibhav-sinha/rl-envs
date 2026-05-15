const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const col = figma.variables.createVariableCollection('Layout');
const modeId = col.modes[0].id;
const gap = figma.variables.createVariable('gap', col, 'FLOAT');
figma.variables.setValueForMode(gap.id, modeId, { type: 'FLOAT', value: 32 });
const row = figma.createAutoLayout();
row.resize(320, 48);
row.x = 80;
row.y = 156;
row.setBoundVariable('itemSpacing', gap);
for (let i = 0; i < 2; i++) {
  const box = figma.createRectangle();
  box.resize(80, 36);
  box.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.85 } }];
  row.appendChild(box);
}
root.appendChild(row);
return { rootId: root.id };
