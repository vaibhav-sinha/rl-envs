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
text.characters = 'Big red link';
text.fontSize = 14;
text.x = 120;
text.y = 160;
text.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.25 } }];
text.setRangeFontSize(0, 3, 24);
text.setRangeFills(0, 3, [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]);
text.setRangeFills(4, 7, [{ type: 'SOLID', color: { r: 0.9, g: 0.1, b: 0.1 } }]);
text.setRangeHyperlink(8, 12, { type: 'URL', value: 'https://example.com' });
root.appendChild(text);
return { rootId: root.id };
