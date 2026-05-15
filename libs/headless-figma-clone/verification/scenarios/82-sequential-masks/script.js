const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const grad = figma.createRectangle();
grad.resize(400, 200);
grad.x = 40;
grad.y = 80;
grad.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.2, g: 0.5, b: 1, a: 1 } }, { position: 1, color: { r: 0.9, g: 0.2, b: 0.5, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(grad);
for (const x of [80, 260]) {
  const m = figma.createEllipse();
  m.resize(100, 100);
  m.x = x;
  m.y = 130;
  m.isMask = true;
  m.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  root.appendChild(m);
}
return { rootId: root.id };
