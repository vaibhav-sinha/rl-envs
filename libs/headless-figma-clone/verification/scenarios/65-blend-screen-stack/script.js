const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const colors = [{ r: 0.8, g: 0.2, b: 0.2 }, { r: 0.2, g: 0.7, b: 0.3 }, { r: 0.2, g: 0.3, b: 0.8 }];
for (let i = 0; i < 3; i++) {
  const r = figma.createRectangle();
  r.resize(180, 120);
  r.x = 120 + i * 40;
  r.y = 100 + i * 30;
  r.fills = [{ type: 'SOLID', color: colors[i] }];
  if (i === 2) r.blendMode = 'SCREEN';
  root.appendChild(r);
}
return { rootId: root.id };
