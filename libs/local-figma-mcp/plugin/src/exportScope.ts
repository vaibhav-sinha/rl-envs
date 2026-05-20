export interface FilePageInfo {
  id: string;
  name: string;
}

export function listFilePages(): FilePageInfo[] {
  return figma.root.children
    .filter((n): n is PageNode => n.type === 'PAGE')
    .map((p) => ({ id: p.id, name: p.name }));
}

export function buildExportExcludeIds(
  excludeNodeIds?: string[],
  includePageIds?: string[]
): Set<string> {
  const exclude = new Set(excludeNodeIds ?? []);
  if (includePageIds === undefined) return exclude;

  if (includePageIds.length === 0) {
    throw new Error('EXPORT_ERROR: no pages selected');
  }

  const include = new Set(includePageIds);
  for (const child of figma.root.children) {
    if (child.type === 'PAGE' && !include.has(child.id)) {
      exclude.add(child.id);
    }
  }
  return exclude;
}
