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
const col = figma.variables.createVariableCollection('Theme');
const lightId = col.modes[0].modeId;
const darkId = col.addMode('Dark');
const theme = figma.variables.createVariable('bg', col, 'COLOR');
theme.setValueForMode(lightId, { r: 0.95, g: 0.96, b: 0.98 });
theme.setValueForMode(darkId, { r: 0.1, g: 0.15, b: 0.35 });
root.setExplicitVariableModeForCollection(col, darkId);
const rect = figma.createRectangle();
rect.resize(280, 180);
rect.x = 100;
rect.y = 90;
root.appendChild(rect);
rect.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', theme)];
return { rootId: root.id };
