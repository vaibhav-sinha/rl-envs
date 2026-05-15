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
const fx = figma.createEffectStyle();
fx.name = 'CardShadow';
fx.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 12 }, radius: 24, blendMode: 'NORMAL', visible: true }];
const card = figma.createRectangle();
card.resize(220, 120);
card.x = 130;
card.y = 120;
card.cornerRadius = 12;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.effectStyleId = fx.id;
root.appendChild(card);
return { rootId: root.id };
