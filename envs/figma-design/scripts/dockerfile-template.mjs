/**
 * Generate per-task environment/Dockerfile content.
 */

export function renderTaskDockerfile() {
  const lines = [
    'FROM metaphi/figma-design-base:latest',
    '',
    'COPY design-spec.json /environment/design-spec.json',
    'COPY instruction.md /tests/instruction.md',
    'COPY assets/ /app/assets/',
    '',
    'RUN node /opt/figma-design/scripts/prepare-task-design.mjs \\',
    '  --spec /environment/design-spec.json',
    '',
    'ENV HFC_INITIAL_FILE=/data/workspace/design.hfc.json',
    'ENV HFC_PREVIEW_ON_LOAD=0',
    '',
  ];
  return `${lines.join('\n')}`;
}
