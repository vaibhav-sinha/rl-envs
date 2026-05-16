const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.97, b: 0.99 } }];
figma.currentPage.appendChild(root);
const col = figma.variables.createVariableCollection('GridGaps');
const modeId = col.modes[0].modeId;
const rowGapVar = figma.variables.createVariable('rowGap', col, 'FLOAT');
rowGapVar.setValueForMode(modeId, 10);
const colGapVar = figma.variables.createVariable('colGap', col, 'FLOAT');
colGapVar.setValueForMode(modeId, 14);
const grid = figma.createFrame();
grid.resize(360, 220);
grid.x = 60;
grid.y = 70;
grid.layoutMode = 'GRID';
grid.gridRowCount = 2;
grid.gridColumnCount = 3;
grid.gridRowGap = 8;
grid.gridColumnGap = 8;
grid.setBoundVariable('gridRowGap', rowGapVar);
grid.setBoundVariable('gridColumnGap', colGapVar);
grid.gridRowSizes = [
  { type: 'FIXED', value: 48 },
  { type: 'FLEX', value: 1 },
];
grid.gridColumnSizes = [
  { type: 'HUG' },
  { type: 'FIXED', value: 100 },
  { type: 'FLEX', value: 1 },
];
grid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
grid.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.89, b: 0.94 } }];
grid.strokeWeight = 1;
root.appendChild(grid);
const colors = [
  { r: 0.9, g: 0.94, b: 1 },
  { r: 0.92, g: 1, b: 0.95 },
  { r: 1, g: 0.94, b: 0.92 },
  { r: 0.96, g: 0.93, b: 1 },
  { r: 0.94, g: 0.97, b: 1 },
  { r: 0.98, g: 0.95, b: 0.9 },
];
for (let i = 0; i < 6; i++) {
  const cell = figma.createRectangle();
  cell.resize(i === 0 ? 56 : 80, i < 3 ? 40 : 72);
  cell.fills = [{ type: 'SOLID', color: colors[i] }];
  cell.cornerRadius = 6;
  grid.appendChild(cell);
}
return { rootId: root.id };
