import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const p = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json'
);
const env = JSON.parse(readFileSync(p, 'utf8'));

function find(nodes, id) {
  if (!nodes) return null;
  if (Array.isArray(nodes)) {
    for (const n of nodes) {
      const hit = find(n, id);
      if (hit) return hit;
    }
    return null;
  }
  if (nodes.id === id) return nodes;
  return find(nodes.children, id);
}

for (const id of ['I1548', 'I1538', 'I1228']) {
  const hit = find(env.document, id);
  console.log(id, hit ? `${hit.type} ${hit.name}` : 'NOT FOUND', hit?.children?.length ?? '');
}
