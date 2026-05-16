const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.13, b: 0.18 } }];
figma.currentPage.appendChild(root);
const card = figma.createFrame();
card.resize(260, 180);
card.x = 110;
card.y = 90;
card.cornerRadius = 24;
card.cornerSmoothing = 0.65;
card.fills = [{ type: 'SOLID', color: { r: 0.18, g: 0.2, b: 0.28 } }];
card.strokes = [
  {
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { r: 0.4, g: 0.7, b: 1, a: 1 } },
      { position: 1, color: { r: 0.9, g: 0.35, b: 0.95, a: 1 } },
    ],
    gradientTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
  },
];
card.strokeWeight = 3;
root.appendChild(card);
const badge = figma.createRectangle();
badge.resize(72, 28);
badge.x = 24;
badge.y = 24;
badge.cornerRadius = 8;
badge.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.28, b: 0.38 } }];
card.appendChild(badge);
badge.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.75, b: 1 } }];
badge.strokeWeight = 2;
badge.strokeTopWeight = 3;
badge.strokeRightWeight = 2;
badge.strokeBottomWeight = 2;
badge.strokeLeftWeight = 2;
return { rootId: root.id };
