const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const rect = figma.createRectangle();
rect.resize(280, 200);
rect.x = 100;
rect.y = 80;
rect.fills = [{
  type: 'GRADIENT_RADIAL',
  gradientStops: [
    { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
    { position: 1, color: { r: 0.2, g: 0.1, b: 0.6, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0.5], [0, 1, 0.5]],
}];
root.appendChild(rect);
return { rootId: root.id };
