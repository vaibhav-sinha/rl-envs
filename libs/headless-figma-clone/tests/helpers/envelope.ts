import type { FileEnvelope } from '../../src/model/types.js';

export function emptyEnvelope(nextInternalId = 10): FileEnvelope {
  return {
    schemaVersion: 1,
    fileKey: 't',
    fileName: 't',
    nextInternalId,
    document: {
      id: 'I1',
      type: 'DOCUMENT',
      name: 'Document',
      children: [
        {
          id: 'I2',
          type: 'PAGE',
          name: 'Page 1',
          children: [],
        },
      ],
    },
  };
}

export function pageId(env: FileEnvelope): string {
  return env.document.children[0]!.id;
}
