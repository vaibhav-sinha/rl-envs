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
const parent = figma.createFrame();
parent.resize(120, 220);
parent.x = 180;
parent.y = 70;
parent.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.91, b: 0.94 } }];
const child = figma.createRectangle();
child.resize(80, 40);
child.x = 20;
child.constraints = { horizontal: 'CENTER', vertical: 'TOP_BOTTOM' };
child.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.5, b: 0.85 } }];
parent.appendChild(child);
root.appendChild(parent);
return { rootId: root.id };
