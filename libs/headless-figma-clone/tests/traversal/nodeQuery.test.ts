import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { buildGraphIndexes } from '../../src/engine/nodeIndex.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { queryDescendants } from '../../src/traversal/nodeQuery.js';
import { resolveParentNode } from '../../src/engine/nodeIndex.js';

describe('nodeQuery selector engine', () => {
  it('leading child combinator matches direct children of scope', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'NodeQuery' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
figma.currentPage.appendChild(shell);
const nested = figma.createFrame();
nested.name = 'Nested';
shell.appendChild(nested);
const inner = figma.createRectangle();
inner.name = 'Inner';
nested.appendChild(inner);
return { nestedId: nested.id, innerId: inner.id };
`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const { nestedId, innerId } = run.result as { nestedId: string; innerId: string };
    const file = engine.getActiveFile()!;
    const nested = findEnvelopeNode(file, nestedId)!;
    const graphIndexes = buildGraphIndexes(file);
    expect(resolveParentNode(graphIndexes, innerId)?.id).toBe(nestedId);
    const ctx = { working: file, graphIndexes, nodeIndex: graphIndexes.nodes };
    const hits = queryDescendants(nested, '> RECTANGLE', ctx);
    expect(hits.map((n) => n.id)).toEqual([innerId]);
  });
});
