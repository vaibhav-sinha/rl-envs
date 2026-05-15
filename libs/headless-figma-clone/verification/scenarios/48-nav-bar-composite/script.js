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
const nav = createAutoLayout();
nav.resize(440, 52);
nav.x = 20;
nav.y = 20;
nav.paddingLeft = 16;
nav.paddingRight = 16;
nav.itemSpacing = 16;
nav.counterAxisAlignItems = 'CENTER';
nav.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
const logo = figma.createRectangle();
logo.resize(32, 32);
logo.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
nav.appendChild(logo);
const links = figma.createText();
links.characters = 'Home  About  Contact';
links.fontSize = 14;
nav.appendChild(links);
const cta = figma.createRectangle();
cta.resize(72, 32);
cta.cornerRadius = 6;
cta.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.45, b: 0.95 } }];
nav.appendChild(cta);
root.appendChild(nav);
return { rootId: root.id };
