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
const sources = [
  'https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png',
];
const row = createAutoLayout('HORIZONTAL');
row.resize(420, 140);
row.x = 30;
row.y = 110;
row.itemSpacing = 12;
row.paddingLeft = 12;
row.paddingRight = 12;
row.paddingTop = 12;
row.paddingBottom = 12;
row.cornerRadius = 10;
row.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(row);
for (const src of sources) {
  const img = await figma.createImageAsync(src);
  const tile = figma.createRectangle();
  tile.resize(124, 116);
  tile.cornerRadius = 8;
  tile.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  row.appendChild(tile);
}
return { rootId: root.id };
