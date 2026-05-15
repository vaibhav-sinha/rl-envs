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
const col = figma.variables.createVariableCollection('Brand');
const modeId = col.modes[0].modeId;
const brand = figma.variables.createVariable('primary', col, 'COLOR');
brand.setValueForMode(modeId, { r: 0.9, g: 0.15, b: 0.2 });
const rect = figma.createRectangle();
rect.resize(200, 100);
rect.x = 140;
rect.y = 130;
root.appendChild(rect);
rect.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', brand)];
return { rootId: root.id };
