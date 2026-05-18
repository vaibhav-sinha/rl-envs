/**
 * Generate per-task environment/Dockerfile content.
 */

export function sidecarDirForFixture(fixturePath) {
  if (!fixturePath.endsWith('.hfc.json')) {
    return null;
  }
  return fixturePath.slice(0, -'.hfc.json'.length) + '.hfc.assets';
}

export function renderTaskDockerfile({ hasSidecar = false } = {}) {
  const lines = [
    'FROM metaphi/figma-design-base:latest',
    '',
    'COPY design.hfc.json /data/workspace/design.hfc.json',
    'COPY design.hfc.json /tests/design.initial.hfc.json',
    'COPY instruction.md /tests/instruction.md',
    'ENV HFC_INITIAL_FILE=/data/workspace/design.hfc.json',
    '',
    'COPY assets/ /app/assets/',
  ];
  if (hasSidecar) {
    lines.push('', 'COPY design.hfc.assets/ /data/workspace/design.hfc.assets/');
  }
  lines.push('');
  return `${lines.join('\n')}`;
}
