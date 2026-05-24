import type { FileEnvelope, SceneNode } from '../src/model/types.js';

/** Mirror of componentGraphNormalize.bumpNextInternalIdFromDocument for benchmarking. */
export function bumpNextInternalIdFromDocumentForBench(env: FileEnvelope): void {
  let maxIdNum = 0;
  const scan = (nodes: SceneNode[]): void => {
    for (const n of nodes) {
      if (typeof n.id === 'string') {
        const m = n.id.match(/^I(\d+)$/);
        if (m) maxIdNum = Math.max(maxIdNum, Number(m[1]!));
      }
      if (
        n.type === 'FRAME' ||
        n.type === 'TRANSFORM_GROUP' ||
        n.type === 'GROUP' ||
        n.type === 'SECTION' ||
        n.type === 'BOOLEAN_OPERATION'
      ) {
        const kids =
          n.type === 'BOOLEAN_OPERATION'
            ? (n.children as unknown as SceneNode[])
            : n.children;
        scan(kids);
      }
    }
  };
  for (const page of env.document.children) {
    const m = page.id.match(/^I(\d+)$/);
    if (m) maxIdNum = Math.max(maxIdNum, Number(m[1]!));
    scan(page.children as SceneNode[]);
  }
  if (maxIdNum + 1 > env.nextInternalId) {
    env.nextInternalId = maxIdNum + 1;
  }
}
