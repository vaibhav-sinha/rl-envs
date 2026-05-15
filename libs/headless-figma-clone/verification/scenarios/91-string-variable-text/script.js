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
const col = figma.variables.createVariableCollection('Copy');
const modeId = col.modes[0].id;
const label = figma.variables.createVariable('greeting', col, 'STRING');
figma.variables.setValueForMode(label.id, modeId, { type: 'STRING', value: 'Hello' });
const text = figma.createText();
text.x = 180;
text.y = 160;
text.fontSize = 20;
text.setBoundVariable('characters', label);
root.appendChild(text);
return { rootId: root.id };
