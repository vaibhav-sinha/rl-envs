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
const arc = figma.createEllipse();
arc.resize(200, 200);
arc.x = 140;
arc.y = 80;
arc.arcData = { startingAngle: 0, endingAngle: Math.PI * 1.25, innerRadius: 0.55 };
arc.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.55, b: 0.95 } }];
root.appendChild(arc);
return { rootId: root.id };
