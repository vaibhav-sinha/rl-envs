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
const modeId = col.modes[0].id;
const base = figma.variables.createVariable('base', col, 'COLOR');
figma.variables.setValueForMode(base.id, modeId, { type: 'COLOR', color: { r: 0.2, g: 0.75, b: 0.35 } });
const alias = figma.variables.createVariable('accent', col, 'COLOR');
figma.variables.setValueForMode(alias.id, modeId, { type: 'VARIABLE_ALIAS', id: base.id });
const rect = figma.createRectangle();
rect.resize(200, 100);
rect.x = 140;
rect.y = 130;
root.appendChild(rect);
rect.setBoundVariable('fills', alias);
return { rootId: root.id };
