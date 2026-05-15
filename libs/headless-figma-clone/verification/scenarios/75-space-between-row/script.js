const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const row = figma.createAutoLayout();
row.resize(400, 40);
row.x = 40;
row.y = 160;
row.primaryAxisAlignItems = 'SPACE_BETWEEN';
for (let i = 0; i < 4; i++) {
  const dot = figma.createEllipse();
  dot.resize(24, 24);
  dot.fills = [{ type: 'SOLID', color: { r: 0.15 + i * 0.2, g: 0.45, b: 0.85 } }];
  row.appendChild(dot);
}
root.appendChild(row);
return { rootId: root.id };
