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
const a = figma.createRectangle();
a.resize(200, 160);
a.x = 120;
a.y = 100;
a.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.3 } }];
root.appendChild(a);
const b = figma.createRectangle();
b.resize(200, 160);
b.x = 200;
b.y = 140;
b.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
b.blendMode = 'MULTIPLY';
root.appendChild(b);
return { rootId: root.id };
