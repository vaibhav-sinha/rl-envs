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
a.resize(80, 80);
a.x = 140;
a.y = 120;
a.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.2 } }];
root.appendChild(a);
const b = figma.createRectangle();
b.resize(80, 80);
b.x = 180;
b.y = 150;
b.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.9 } }];
root.appendChild(b);
const g = figma.group([a, b], root);
g.x = 20;
return { rootId: root.id };
