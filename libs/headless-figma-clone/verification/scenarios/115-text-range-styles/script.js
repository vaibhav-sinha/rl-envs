await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.99 } }];
figma.currentPage.appendChild(root);
const label = figma.createText();
label.characters = 'PREMIUM · Annual plan saves 20%';
label.fontSize = 14;
label.x = 48;
label.y = 140;
label.resize(384, 48);
label.setRangeFontSize(0, 7, 22);
label.setRangeTextCase(0, 7, 'UPPER');
label.setRangeFontName(0, 7, { family: 'Inter', style: 'Bold' });
label.setRangeFills(8, label.characters.length, [{ type: 'SOLID', color: { r: 0.35, g: 0.4, b: 0.5 } }]);
const segments = label.getStyledTextSegments(['fontSize', 'fontName', 'fills']);
if (!segments || segments.length < 2) {
  throw new Error('expected multiple styled segments');
}
root.appendChild(label);
return { rootId: root.id };
