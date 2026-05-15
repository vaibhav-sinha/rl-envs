await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
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
text.styledSegments = [
  { start: 0, end: 3, fontSize: 24, fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }] },
  { start: 4, end: 7, fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.1, b: 0.1 } }] },
  { start: 8, end: 12, hyperlink: { type: 'URL', value: 'https://example.com' } },
];
root.appendChild(text);
return { rootId: root.id };
