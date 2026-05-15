function createAutoLayout(direction) {
  if (typeof figma.createAutoLayout === 'function') {
    return figma.createAutoLayout(direction);
  }
  const frame = figma.createFrame();
  frame.layoutMode = direction === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
  return frame;
}
const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
const content = figma.createRectangle();
content.resize(320, 200);
content.x = 80;
content.y = 80;
content.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.9, g: 0.3, b: 0.2, a: 1 } }, { position: 1, color: { r: 0.2, g: 0.3, b: 0.9, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(content);
const mask = figma.createRectangle();
mask.resize(140, 200);
mask.x = 170;
mask.y = 80;
mask.rotation = 30;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
return { rootId: root.id };
