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
const star = figma.createStar();
star.pointCount = 5;
star.innerRadius = 0.4;
star.resize(140, 140);
star.x = 170;
star.y = 110;
star.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.8, b: 0.1 } }];
root.appendChild(star);
return { rootId: root.id };
