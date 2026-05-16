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
root.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
figma.currentPage.appendChild(root);
const fillStyle = figma.createPaintStyle();
fillStyle.name = 'StackBase';
fillStyle.paints = [{ type: 'SOLID', color: { r: 0.92, g: 0.94, b: 1 } }];
const effectStyle = figma.createEffectStyle();
effectStyle.name = 'StackShadow';
effectStyle.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 6 }, radius: 14, blendMode: 'NORMAL', visible: true }];
const stack = createAutoLayout('HORIZONTAL');
stack.resize(320, 120);
stack.x = 80;
stack.y = 120;
stack.itemSpacing = 0;
stack.itemReverseZIndex = true;
stack.fillStyleId = fillStyle.id;
stack.effectStyleId = effectStyle.id;
stack.paddingLeft = 16;
stack.paddingRight = 16;
stack.paddingTop = 16;
stack.paddingBottom = 16;
stack.cornerRadius = 12;
root.appendChild(stack);
const hues = [0.55, 0.72, 0.38];
for (let i = 0; i < 3; i++) {
  const chip = figma.createRectangle();
  chip.resize(110, 88);
  chip.cornerRadius = 10;
  chip.fills = [{ type: 'SOLID', color: { r: hues[i], g: 0.45, b: 0.9 } }];
  stack.appendChild(chip);
}
return { rootId: root.id };
