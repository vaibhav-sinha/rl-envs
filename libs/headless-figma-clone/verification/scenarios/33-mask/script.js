const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const content = figma.createRectangle();
content.resize(240, 160);
content.x = 120;
content.y = 100;
content.fills = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 0.2, g: 0.5, b: 1, a: 1 } },
    { position: 1, color: { r: 0.9, g: 0.2, b: 0.5, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
root.appendChild(content);
const mask = figma.createEllipse();
mask.resize(160, 160);
mask.x = 160;
mask.y = 100;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
mask.isMask = true;
root.appendChild(mask);
return { rootId: root.id };
