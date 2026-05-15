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
const back = figma.createRectangle();
back.resize(220, 140);
back.x = 130;
back.y = 130;
back.cornerRadius = 12;
back.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
back.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 10 }, radius: 20, visible: true }];
root.appendChild(back);
const front = figma.createRectangle();
front.resize(200, 120);
front.x = 140;
front.y = 100;
front.fills = [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: { r: 0.3, g: 0.6, b: 1, a: 1 } }, { position: 1, color: { r: 0.8, g: 0.2, b: 0.6, a: 1 } }], gradientTransform: [[1,0,0],[0,1,0]] }];
root.appendChild(front);
const mask = figma.createEllipse();
mask.resize(120, 120);
mask.x = 180;
mask.y = 110;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
return { rootId: root.id };
