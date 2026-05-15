const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const colors = [
  { r: 0.9, g: 0.2, b: 0.2 },
  { r: 0.2, g: 0.75, b: 0.3 },
  { r: 0.2, g: 0.4, b: 0.9 },
  { r: 0.95, g: 0.75, b: 0.1 },
  { r: 0.5, g: 0.2, b: 0.8 },
];
for (const c of colors) {
  const r = figma.createRectangle();
  r.resize(160, 120);
  r.x = 160;
  r.y = 120;
  r.fills = [{ type: 'SOLID', color: c }];
  root.appendChild(r);
}
return { rootId: root.id };
