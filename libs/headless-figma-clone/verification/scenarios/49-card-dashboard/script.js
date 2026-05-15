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
const card = figma.createFrame();
card.resize(320, 200);
card.x = 80;
card.y = 80;
card.cornerRadius = 16;
card.fills = [{
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 0.15, g: 0.35, b: 0.85, a: 1 } },
    { position: 1, color: { r: 0.4, g: 0.2, b: 0.7, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
card.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 6 }, radius: 20, visible: true }];
const panel = figma.createFrame();
panel.resize(200, 80);
panel.x = 60;
panel.y = 60;
panel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.3 } }];
panel.effects = [{ type: 'BACKDROP_BLUR', radius: 10, visible: true }];
card.appendChild(panel);
root.appendChild(card);
return { rootId: root.id };
