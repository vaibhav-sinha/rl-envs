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
const deck = createAutoLayout('HORIZONTAL');
deck.resize(448, 310);
deck.x = 16;
deck.y = 26;
deck.itemSpacing = 10;
deck.counterAxisAlignItems = 'MAX';
function tier(name, price, blurb, feat, featured) {
  const col = createAutoLayout('VERTICAL');
  col.resize(142, featured ? 310 : 286);
  col.paddingTop = 16;
  col.paddingLeft = 12;
  col.paddingRight = 12;
  col.paddingBottom = 16;
  col.itemSpacing = 10;
  col.cornerRadius = 16;
  col.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  col.strokes = [{ type: 'SOLID', color: featured ? { r: 0.18, g: 0.48, b: 1 } : { r: 0.9, g: 0.91, b: 0.95 } }];
  col.strokeWeight = featured ? 2 : 1;
  col.effects = featured
    ? [{ type: 'DROP_SHADOW', color: { r: 0.1, g: 0.2, b: 0.45, a: 0.22 }, offset: { x: 0, y: 14 }, radius: 28, blendMode: 'NORMAL', visible: true }]
    : [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 6 }, radius: 14, blendMode: 'NORMAL', visible: true }];
  const star = figma.createText();
  star.characters = name;
  star.fontSize = 13;
  star.fills = [{ type: 'SOLID', color: featured ? { r: 0.14, g: 0.42, b: 0.98 } : { r: 0.2, g: 0.22, b: 0.28 } }];
  const money = figma.createText();
  money.characters = price;
  money.fontSize = 22;
  money.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.09, b: 0.14 } }];
  const bd = figma.createText();
  bd.characters = blurb;
  bd.fontSize = 10;
  bd.fills = [{ type: 'SOLID', color: { r: 0.48, g: 0.5, b: 0.56 } }];
  col.appendChild(star);
  col.appendChild(money);
  col.appendChild(bd);
  const rule = figma.createRectangle();
  rule.resize(118, 1);
  rule.fills = [{ type: 'SOLID', color: { r: 0.92, g: 0.93, b: 0.96 } }];
  col.appendChild(rule);
  for (const line of feat) {
    const row = createAutoLayout('HORIZONTAL');
    row.itemSpacing = 8;
    row.counterAxisAlignItems = 'CENTER';
    const ic = figma.createRectangle();
    ic.resize(14, 14);
    ic.cornerRadius = 7;
    ic.fills = [{ type: 'SOLID', color: { r: 0.78, g: 0.95, b: 0.85 } }];
    const tx = figma.createText();
    tx.characters = line;
    tx.fontSize = 10;
    tx.fills = [{ type: 'SOLID', color: { r: 0.25, g: 0.27, b: 0.34 } }];
    row.appendChild(ic);
    row.appendChild(tx);
    col.appendChild(row);
  }
  const cta = figma.createRectangle();
  cta.resize(118, 34);
  cta.cornerRadius = 10;
  cta.fills = [{ type: 'SOLID', color: featured ? { r: 0.14, g: 0.42, b: 0.98 } : { r: 0.96, g: 0.97, b: 1 } }];
  if (!featured) {
    cta.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.87, b: 0.92 } }];
    cta.strokeWeight = 1;
  }
  col.appendChild(cta);
  return col;
}
deck.appendChild(tier('Starter', '$0', 'Prototype solo', ['Unlimited drafts', 'Email support'], false));
deck.appendChild(tier('Pro', '$49', 'For shipping teams', ['Insights + SSO', 'Shared libraries'], true));
deck.appendChild(tier('Scale', '$149', 'Compliance ready', ['Audit logs', 'SAML'], false));
root.appendChild(deck);
return { rootId: root.id };
