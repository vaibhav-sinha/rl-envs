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
const frame = figma.createFrame();
frame.resize(100, 40);
frame.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);
const inst = figma.createComponentInstance(comp.id);
inst.x = 190;
inst.y = 160;
root.appendChild(inst);
if (inst.children && inst.children[0]) {
  inst.children[0].fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.5, b: 0.1 } }];
}
return { rootId: root.id };
