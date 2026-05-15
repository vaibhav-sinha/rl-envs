await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
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
frame.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.3, b: 0.85 } }];
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);
const inst = comp.createInstance();
inst.x = 190;
inst.y = 160;
root.appendChild(inst);
inst.detachInstance();
return { rootId: root.id };
