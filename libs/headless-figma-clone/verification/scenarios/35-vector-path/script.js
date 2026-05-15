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
const vec = figma.createVector();
vec.resize(120, 100);
vec.x = 180;
vec.y = 130;
vec.vectorPaths = [{
  windingRule: 'NONZERO',
  data: 'M 60 10 L 110 90 L 10 90 Z',
}];
vec.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.65, b: 0.4 } }];
root.appendChild(vec);
return { rootId: root.id };
