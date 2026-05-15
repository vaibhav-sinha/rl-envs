const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const rect = figma.createRectangle();
rect.resize(300, 180);
rect.x = 90;
rect.y = 90;
rect.fills = [
  { type: 'SOLID', color: { r: 0.2, g: 0.3, b: 0.8 } },
  {
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { r: 1, g: 1, b: 1, a: 0.6 } },
      { position: 1, color: { r: 0, g: 0, b: 0, a: 0.2 } },
    ],
    gradientTransform: [[0, 1, 0], [1, 0, 0]],
  },
];
root.appendChild(rect);
return { rootId: root.id };
