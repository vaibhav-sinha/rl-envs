export const PLUGIN_VERSION = '1.0.0';

export function normalizeNodeId(id: string): string {
  if (!id) return id;
  return id.replace(/-/g, ':');
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function nodeTagName(node: SceneNode): string {
  return node.type.toLowerCase().replace(/_/g, '-');
}
