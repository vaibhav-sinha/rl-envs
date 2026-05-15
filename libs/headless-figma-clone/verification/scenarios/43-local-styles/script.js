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
const paintStyle = figma.createPaintStyle();
paintStyle.name = 'BrandFill';
paintStyle.paints = [{ type: 'SOLID', color: { r: 0.1, g: 0.45, b: 0.85 } }];
const textStyle = figma.createTextStyle();
textStyle.name = 'Heading';
textStyle.fontSize = 24;
const rect = figma.createRectangle();
rect.resize(280, 80);
rect.x = 100;
rect.y = 140;
root.appendChild(rect);
await rect.setFillStyleIdAsync(paintStyle.id);
const text = figma.createText();
text.characters = 'Styled';
text.x = 200;
text.y = 160;
root.appendChild(text);
await text.setTextStyleIdAsync(textStyle.id);
return { rootId: root.id };
