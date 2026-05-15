const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const row = figma.createAutoLayout();
row.resize(360, 56);
row.x = 60;
row.y = 150;
row.itemSpacing = 12;
row.paddingLeft = 12;
row.paddingRight = 12;
row.paddingTop = 8;
row.paddingBottom = 8;
const colors = [
  { r: 0.9, g: 0.2, b: 0.2 },
  { r: 0.2, g: 0.7, b: 0.3 },
  { r: 0.2, g: 0.4, b: 0.9 },
];
for (let i = 0; i < 3; i++) {
  const pill = figma.createRectangle();
  pill.resize(80, 32);
  pill.fills = [{ type: 'SOLID', color: colors[i] }];
  row.appendChild(pill);
}
root.appendChild(row);
return { rootId: root.id };
