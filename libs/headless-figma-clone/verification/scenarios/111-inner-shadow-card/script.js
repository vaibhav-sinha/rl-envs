const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
figma.currentPage.appendChild(root);
const card = figma.createFrame();
card.resize(260, 160);
card.x = 110;
card.y = 100;
card.cornerRadius = 16;
card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
card.effects = [
  { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 8 }, radius: 20, spread: 0, blendMode: 'NORMAL', visible: true },
  { type: 'INNER_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.18 }, offset: { x: 0, y: 2 }, radius: 6, spread: 0, blendMode: 'NORMAL', visible: true },
];
root.appendChild(card);
const accent = figma.createRectangle();
accent.resize(260, 6);
accent.cornerRadius = 16;
accent.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45, b: 0.95 } }];
card.appendChild(accent);
return { rootId: root.id };
