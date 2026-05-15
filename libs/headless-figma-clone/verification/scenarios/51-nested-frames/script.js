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
const l1 = figma.createFrame();
l1.resize(360, 260);
l1.x = 60;
l1.y = 50;
l1.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.9, b: 0.95 } }];
const l2 = figma.createFrame();
l2.resize(280, 180);
l2.x = 40;
l2.y = 40;
l2.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.8, b: 0.95 } }];
const l3 = figma.createFrame();
l3.resize(160, 80);
l3.x = 60;
l3.y = 50;
l3.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.9 } }];
l2.appendChild(l3);
l1.appendChild(l2);
root.appendChild(l1);
return { rootId: root.id };
