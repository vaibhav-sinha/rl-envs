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
const variants = [];
for (const color of ['blue', 'green']) {
  const f = figma.createFrame();
  f.resize(80, 32);
  f.fills = [{ type: 'SOLID', color: color === 'blue' ? { r: 0.2, g: 0.5, b: 0.9 } : { r: 0.2, g: 0.7, b: 0.35 } }];
  figma.currentPage.appendChild(f);
  variants.push(figma.createComponentFromNode(f));
}
const set = figma.combineAsVariants(variants, figma.currentPage);
let i = 0;
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 2; col++) {
    const inst = variants[col].createInstance();
    inst.x = 100 + col * 100;
    inst.y = 100 + row * 48;
    root.appendChild(inst);
    i++;
  }
}
return { rootId: root.id };
