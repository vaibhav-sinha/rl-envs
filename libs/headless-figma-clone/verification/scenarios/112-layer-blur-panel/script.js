const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.14, b: 0.22 } }];
figma.currentPage.appendChild(root);
for (let i = 0; i < 5; i++) {
  const blob = figma.createEllipse();
  blob.resize(120 + i * 20, 90 + i * 10);
  blob.x = 40 + i * 70;
  blob.y = 60 + (i % 2) * 40;
  blob.fills = [{ type: 'SOLID', color: { r: 0.35 + i * 0.1, g: 0.2, b: 0.75 } }];
  root.appendChild(blob);
}
const glass = figma.createFrame();
glass.resize(280, 140);
glass.x = 100;
glass.y = 110;
glass.cornerRadius = 12;
glass.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.15 } }];
glass.effects = [
  { type: 'LAYER_BLUR', radius: 18, visible: true },
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.35 }, offset: { x: 0, y: 6 }, radius: 16, spread: 0, blendMode: 'NORMAL', visible: true },
];
root.appendChild(glass);
return { rootId: root.id };
