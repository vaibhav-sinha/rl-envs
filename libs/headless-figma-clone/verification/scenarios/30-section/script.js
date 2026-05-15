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
const section = figma.createSection();
section.resize(400, 200);
section.x = 40;
section.y = 80;
section.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.95, a: 0.5 } }];
const inner = figma.createFrame();
inner.resize(160, 80);
inner.x = 20;
inner.y = 40;
inner.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
section.appendChild(inner);
root.appendChild(section);
return { rootId: root.id };
