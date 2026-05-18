export function getSingleSelectedNode(): SceneNode {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) {
    throw new Error('SELECTION_ERROR: No selection — select exactly one node');
  }
  if (sel.length > 1) {
    throw new Error('SELECTION_ERROR: Multiple nodes selected — select exactly one node');
  }
  return sel[0]!;
}

export function getSelectedNodeIds(): string[] {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) {
    throw new Error('SELECTION_ERROR: No selection — select one or more nodes to exclude');
  }
  return sel.map((n) => n.id);
}
