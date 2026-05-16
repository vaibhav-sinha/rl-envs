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
const img = await figma.createImageAsync(
  'https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg'
);
const hero = figma.createRectangle();
hero.resize(360, 220);
hero.x = 60;
hero.y = 70;
hero.cornerRadius = 16;
hero.fills = [
  { type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' },
  {
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { r: 0, g: 0, b: 0, a: 0 } },
      { position: 0.55, color: { r: 0, g: 0, b: 0, a: 0.05 } },
      { position: 1, color: { r: 0.05, g: 0.15, b: 0.45, a: 0.82 } },
    ],
    gradientTransform: [
      [0, 1, 0],
      [1, 0, 0],
    ],
  },
];
root.appendChild(hero);
return { rootId: root.id };
