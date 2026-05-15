import { escapeXml, nodeTagName, normalizeNodeId } from '../utils.js';

const MAX_DEPTH = 64;

function boundsAttrs(node: SceneNode): string {
  if (!('absoluteBoundingBox' in node) || !node.absoluteBoundingBox) return '';
  const b = node.absoluteBoundingBox;
  return ` x="${b.x.toFixed(2)}" y="${b.y.toFixed(2)}" width="${b.width.toFixed(2)}" height="${b.height.toFixed(2)}"`;
}

function nodeToXml(node: SceneNode, depth: number, maxDepth: number): string {
  if (depth > maxDepth) return '';
  const tag = nodeTagName(node);
  const attrs = `id="${escapeXml(node.id)}" name="${escapeXml(node.name)}" type="${escapeXml(node.type)}"${boundsAttrs(node)}`;
  if ('children' in node && node.children.length > 0 && depth < maxDepth) {
    const kids = node.children.map((c) => nodeToXml(c, depth + 1, maxDepth)).join('');
    return `<${tag} ${attrs}>${kids}</${tag}>`;
  }
  return `<${tag} ${attrs}/>`;
}

function listPagesXml(): string {
  const lines = figma.root.children.map(
    (p) => `<page id="${escapeXml(p.id)}" name="${escapeXml(p.name)}"/>`
  );
  return `<pages>${lines.join('')}</pages>`;
}

export async function runGetMetadata(args: {
  nodeId?: string;
}): Promise<{ type: 'text'; text: string }[]> {

  if (!args.nodeId || args.nodeId === '') {
    const sel = figma.currentPage.selection;
    if (sel.length > 0) {
      const parts = sel.map((n) => nodeToXml(n, 0, MAX_DEPTH));
      return [{ type: 'text', text: `<metadata>${parts.join('')}</metadata>` }];
    }
    return [{ type: 'text', text: listPagesXml() }];
  }

  const id = normalizeNodeId(args.nodeId);
  const node = await figma.getNodeByIdAsync(id);
  if (!node || !('type' in node)) {
    throw new Error(`UNKNOWN_NODE: No node with id ${id}`);
  }
  if (node.type === 'PAGE') {
    const page = node as PageNode;
    const kids = page.children.map((c) => nodeToXml(c, 0, MAX_DEPTH)).join('');
    return [
      {
        type: 'text',
        text: `<metadata><page id="${escapeXml(page.id)}" name="${escapeXml(page.name)}">${kids}</page></metadata>`,
      },
    ];
  }
  if ('absoluteBoundingBox' in node || 'children' in node) {
    return [
      {
        type: 'text',
        text: `<metadata>${nodeToXml(node as SceneNode, 0, MAX_DEPTH)}</metadata>`,
      },
    ];
  }
  throw new Error(`UNSUPPORTED_NODE: Cannot serialize node type ${node.type}`);
}
