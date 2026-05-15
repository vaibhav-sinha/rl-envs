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
content.resize(180, 120);
content.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.2, g: 0.6, b: 1, a: 1 } }, { position: 1, color: { r: 0.9, g: 0.3, b: 0.5, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(content);
const mask = figma.createEllipse();
mask.resize(100, 100);
mask.x = 40;
mask.y = 10;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
const a = figma.createRectangle();
a.resize(40, 40);
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
root.appendChild(a);
const tg = figma.transformGroup([content, mask, a], root);
tg.x = 150;
tg.y = 110;
tg.rotation = 15;
return { rootId: root.id };
