const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.97, b: 0.99 } }];
figma.currentPage.appendChild(root);
const col = figma.variables.createVariableCollection('EffectVars');
const modeId = col.modes[0].modeId;
const radiusVar = figma.variables.createVariable('shadowRadius', col, 'FLOAT');
radiusVar.setValueForMode(modeId, 22);
const colorVar = figma.variables.createVariable('shadowColor', col, 'COLOR');
colorVar.setValueForMode(modeId, { r: 0.15, g: 0.35, b: 0.85, a: 0.45 });
const offsetVar = figma.variables.createVariable('shadowOffsetY', col, 'FLOAT');
offsetVar.setValueForMode(modeId, 10);
let shadow = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  offset: { x: 0, y: 4 },
  radius: 8,
  spread: 0,
  blendMode: 'NORMAL',
  visible: true,
};
shadow = figma.variables.setBoundVariableForEffect(shadow, 'radius', radiusVar);
shadow = figma.variables.setBoundVariableForEffect(shadow, 'color', colorVar);
shadow = figma.variables.setBoundVariableForEffect(shadow, 'offsetY', offsetVar);
const tile = figma.createRectangle();
tile.resize(200, 120);
tile.x = 140;
tile.y = 120;
tile.cornerRadius = 14;
tile.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
tile.effects = [shadow];
root.appendChild(tile);
return { rootId: root.id };
