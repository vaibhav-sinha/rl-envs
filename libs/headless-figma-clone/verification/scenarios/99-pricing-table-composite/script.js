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
const col = figma.variables.createVariableCollection('Pricing');
const modeId = col.modes[0].id;
const price = figma.variables.createVariable('price', col, 'STRING');
figma.variables.setValueForMode(price.id, modeId, { type: 'STRING', value: '$19' });
const title = figma.createText();
title.characters = 'Plans';
title.fontSize = 20;
title.x = 200;
title.y = 24;
root.appendChild(title);
const table = figma.createTable(3, 2);
table.x = 80;
table.y = 60;
table.resize(320, 160);
root.appendChild(table);
return { rootId: root.id };
