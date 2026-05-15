const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const frame = figma.createFrame();
frame.resize(400, 120);
frame.x = 40;
frame.y = 120;
frame.layoutGrids = [{ pattern: 'COLUMNS', sectionSize: 80, gutterSize: 12, color: { r: 0, g: 0.3, b: 0.8, a: 0.12 } }];
const toolbar = figma.createAutoLayout();
toolbar.itemSpacing = 8;
toolbar.x = 16;
toolbar.y = 40;
for (let i = 0; i < 4; i++) {
  const btn = figma.createRectangle();
  btn.resize(48, 32);
  btn.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45 + i * 0.1, b: 0.85 } }];
  toolbar.appendChild(btn);
}
frame.appendChild(toolbar);
root.appendChild(frame);
return { rootId: root.id };
