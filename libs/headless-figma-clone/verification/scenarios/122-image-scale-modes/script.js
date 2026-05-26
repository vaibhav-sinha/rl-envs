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
  'https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg'
);
const modes = ['FILL', 'FIT', 'CROP', 'TILE'];
const panel = createAutoLayout('HORIZONTAL');
panel.resize(420, 150);
panel.x = 30;
panel.y = 105;
panel.itemSpacing = 14;
panel.paddingLeft = 14;
panel.paddingRight = 14;
panel.paddingTop = 14;
panel.paddingBottom = 14;
panel.cornerRadius = 10;
panel.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.96 } }];
root.appendChild(panel);
for (const mode of modes) {
  const sample = figma.createRectangle();
  sample.resize(120, 122);
  sample.cornerRadius = 8;
  sample.fills = [
    { type: 'IMAGE', imageHash: img.hash, scaleMode: mode },
    { type: 'SOLID', color: { r: 0.85, g: 0.88, b: 0.92 }, visible: mode === 'FIT' },
  ];
  panel.appendChild(sample);
}
return { rootId: root.id };
