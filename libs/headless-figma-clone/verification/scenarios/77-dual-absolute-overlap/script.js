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
const host = createAutoLayout();
host.resize(200, 120);
host.x = 140;
host.y = 120;
const icon = figma.createRectangle();
icon.resize(48, 48);
icon.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.45, b: 0.9 } }];
const badge = figma.createEllipse();
badge.resize(28, 28);
badge.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.2, b: 0.2 } }];
host.appendChild(icon);
icon.layoutPositioning = 'ABSOLUTE';
icon.x = 76;
icon.y = 36;
host.appendChild(badge);
badge.layoutPositioning = 'ABSOLUTE';
badge.x = 100;
badge.y = 28;
root.appendChild(host);
return { rootId: root.id };
