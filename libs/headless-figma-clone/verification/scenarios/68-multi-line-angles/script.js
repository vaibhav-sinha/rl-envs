const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const angles = [0, 45, 90];
const colors = [{ r: 0.9, g: 0.2, b: 0.2 }, { r: 0.2, g: 0.7, b: 0.35 }, { r: 0.2, g: 0.4, b: 0.9 }];
for (let i = 0; i < 3; i++) {
  const line = figma.createLine();
  line.resize(160, 0);
  line.x = 160;
  line.y = 180;
  line.rotation = angles[i];
  line.strokes = [{ type: 'SOLID', color: colors[i] }];
  line.strokeWeight = 4;
  root.appendChild(line);
}
return { rootId: root.id };
