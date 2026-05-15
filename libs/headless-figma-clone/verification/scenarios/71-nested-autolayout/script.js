function createAutoLayout(direction) {
  if (typeof figma.createAutoLayout === 'function') {
    return figma.createAutoLayout(direction);
  }
  const frame = figma.createFrame();
  frame.layoutMode = direction === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
  return frame;
}

function makeCard() {
  const card = figma.createFrame();
  card.layoutMode = 'VERTICAL';
  card.itemSpacing = 8;
  card.fills = [{ type: 'SOLID', color: { r: 0.99, g: 0.99, b: 1 } }];

  const row = createAutoLayout('HORIZONTAL');
  row.itemSpacing = 10;
  row.primaryAxisAlignItems = 'MIN';

  const wide = figma.createRectangle();
  wide.resize(76, 26);
  wide.fills = [{ type: 'SOLID', color: { r: 0.22, g: 0.48, b: 0.88 } }];

  const accent = figma.createRectangle();
  accent.resize(26, 26);
  accent.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0.32, b: 0.9 } }];

  row.appendChild(wide);
  row.appendChild(accent);
  card.appendChild(row);

  const body = figma.createRectangle();
  body.resize(112, 40);
  body.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.appendChild(body);

  card.resize(120, 86);
  return card;
}

const root = figma.createFrame();
root.name = 'ScenarioRoot';
root.resize(480, 360);
root.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.96, b: 0.98 } }];
figma.currentPage.appendChild(root);

const col = figma.createFrame();
col.layoutMode = 'VERTICAL';
col.itemSpacing = 14;
col.x = 120;
col.y = 72;
col.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.98 } }];
col.paddingTop = 14;
col.paddingLeft = 14;
col.paddingRight = 14;
col.paddingBottom = 14;

root.appendChild(col);
col.appendChild(makeCard());
col.appendChild(makeCard());

return { rootId: root.id };
