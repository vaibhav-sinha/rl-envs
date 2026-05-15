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
const text = figma.createText();
text.characters = 'Hello Figma';
text.fontSize = 16;
text.x = 160;
text.y = 170;
text.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2 } }];
root.appendChild(text);
return { rootId: root.id };
