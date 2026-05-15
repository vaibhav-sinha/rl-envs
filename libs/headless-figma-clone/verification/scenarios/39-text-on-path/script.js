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
const path = figma.createVector();
path.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 80 200 Q 240 80 400 200' }];
path.x = 40;
path.y = 80;
root.appendChild(path);
const text = figma.createText();
text.characters = 'Curved label';
text.fontSize = 14;
text.textOnPath = { pathId: path.id, startOffset: 0 };
text.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.2 } }];
root.appendChild(text);
return { rootId: root.id };
