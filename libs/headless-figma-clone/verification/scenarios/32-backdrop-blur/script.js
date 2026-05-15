const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);
for (let i = 0; i < 5; i++) {
  const stripe = figma.createRectangle();
  stripe.resize(480, 40);
  stripe.y = i * 72;
  stripe.fills = [{ type: 'SOLID', color: { r: (i % 2) * 0.8, g: 0.2 + i * 0.15, b: 0.6 } }];
  root.appendChild(stripe);
}
const panel = figma.createFrame();
panel.resize(280, 140);
panel.x = 100;
panel.y = 110;
panel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.35 } }];
panel.effects = [{ type: 'BACKDROP_BLUR', radius: 12, visible: true }];
root.appendChild(panel);
return { rootId: root.id };
