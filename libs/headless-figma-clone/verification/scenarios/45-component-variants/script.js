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
const fA = figma.createFrame();
fA.resize(100, 40);
fA.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.3 } }];
figma.currentPage.appendChild(fA);
const cA = figma.createComponentFromNode(fA);
const fB = figma.createFrame();
fB.resize(100, 40);
fB.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.2 } }];
figma.currentPage.appendChild(fB);
const cB = figma.createComponentFromNode(fB);
const set = figma.combineAsVariants([cA, cB], figma.currentPage);
const inst = set.defaultVariant.createInstance();
inst.x = 190;
inst.y = 160;
root.appendChild(inst);
return { rootId: root.id };
