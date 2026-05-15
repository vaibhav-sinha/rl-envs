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
const base = figma.createRectangle();
base.resize(200, 140);
base.x = 140;
base.y = 110;
base.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.9 } }];
root.appendChild(base);
const hole = figma.createEllipse();
hole.resize(80, 80);
hole.x = 200;
hole.y = 140;
hole.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(hole);
figma.subtract([base, hole], root);
return { rootId: root.id };
