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
const el = figma.createEllipse();
el.resize(180, 120);
el.x = 150;
el.y = 120;
el.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.75, b: 0.35 } }];
root.appendChild(el);
return { rootId: root.id };
