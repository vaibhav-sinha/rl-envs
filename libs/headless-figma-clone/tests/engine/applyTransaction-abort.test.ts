import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('applyTransaction abort', () => {
  it('does not mutate activeFile when aborted before apply', async () => {
    const persistence = new JsonPersistence();
    const engine = new DocumentEngine({
      persistence,
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'AbortTx' });
    const before = engine.getActiveFile()!;
    const countBefore = before.document.children[0]!.children.length;

    const ac = new AbortController();
    ac.abort(new Error('tx abort'));
    const r = await engine.applyTransaction(
      [
        {
          op: 'createNode',
          parentId: pageId(before),
          node: { type: 'RECTANGLE', name: 'X', x: 0, y: 0, width: 1, height: 1 },
        },
      ],
      { signal: ac.signal }
    );

    expect(r.success).toBe(false);
    expect(engine.getActiveFile()!.document.children[0]!.children.length).toBe(countBefore);
  });
});
