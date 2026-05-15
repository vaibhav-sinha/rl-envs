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
const img = figma.createImage(new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130]));
const photo = figma.createRectangle();
photo.resize(240, 180);
photo.x = 120;
photo.y = 90;
photo.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
root.appendChild(photo);
const mask = figma.createEllipse();
mask.resize(160, 160);
mask.x = 160;
mask.y = 100;
mask.isMask = true;
mask.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
root.appendChild(mask);
return { rootId: root.id };
