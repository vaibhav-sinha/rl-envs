import { closeSync, createWriteStream, fsyncSync, openSync, renameSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import type { WriteStream } from 'node:fs';
import type { DocumentNode, FileEnvelope, PageNode } from '../model/types.js';
import { PersistenceError } from '../util/errors.js';

/** Serialize a node shell (no children) then each child via JSON.stringify to cap save peak RAM. */
function writeNodeShellWithStringifiedChildren(
  stream: WriteStream,
  node: Record<string, unknown>
): void {
  const keys = Object.keys(node).filter((k) => k !== 'children' && node[k] !== undefined);
  stream.write('{');
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) stream.write(',');
    const k = keys[i]!;
    stream.write(JSON.stringify(k));
    stream.write(':');
    writeJsonValue(stream, node[k]);
  }
  const children = (node.children as unknown[]) ?? [];
  stream.write(',"children":[');
  for (let i = 0; i < children.length; i++) {
    if (i > 0) stream.write(',');
    stream.write(JSON.stringify(children[i]));
  }
  stream.write(']}');
}

function writePageToStream(stream: WriteStream, page: PageNode): void {
  writeNodeShellWithStringifiedChildren(stream, page as unknown as Record<string, unknown>);
}

function writeDocumentToStream(stream: WriteStream, doc: DocumentNode): void {
  const shell: Record<string, unknown> = {
    id: doc.id,
    type: doc.type,
    name: doc.name,
  };
  stream.write('{');
  const keys = Object.keys(shell);
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) stream.write(',');
    const k = keys[i]!;
    stream.write(JSON.stringify(k));
    stream.write(':');
    writeJsonValue(stream, shell[k]);
  }
  stream.write(',"children":[');
  for (let i = 0; i < doc.children.length; i++) {
    if (i > 0) stream.write(',');
    writePageToStream(stream, doc.children[i]!);
  }
  stream.write(']}');
}

function writeJsonValue(stream: WriteStream, value: unknown): void {
  if (value === null) {
    stream.write('null');
    return;
  }
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    stream.write(JSON.stringify(value));
    return;
  }
  if (t !== 'object') {
    stream.write('null');
    return;
  }
  if (Array.isArray(value)) {
    stream.write('[');
    for (let i = 0; i < value.length; i++) {
      if (i > 0) stream.write(',');
      writeJsonValue(stream, value[i]);
    }
    stream.write(']');
    return;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined);
  stream.write('{');
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) stream.write(',');
    const k = keys[i]!;
    stream.write(JSON.stringify(k));
    stream.write(':');
    writeJsonValue(stream, obj[k]);
  }
  stream.write('}');
}

function writeEnvelope(stream: WriteStream, envelope: FileEnvelope): void {
  stream.write('{');
  const entries: Array<[string, unknown]> = [
    ['schemaVersion', envelope.schemaVersion],
    ['fileKey', envelope.fileKey],
    ['fileName', envelope.fileName],
    ['nextInternalId', envelope.nextInternalId],
    ['document', envelope.document],
  ];
  if (envelope.assets !== undefined) entries.push(['assets', envelope.assets]);
  if (envelope.variableCollections !== undefined) {
    entries.push(['variableCollections', envelope.variableCollections]);
  }
  if (envelope.activeModeByCollectionId !== undefined) {
    entries.push(['activeModeByCollectionId', envelope.activeModeByCollectionId]);
  }
  if (envelope.paintStyles !== undefined) entries.push(['paintStyles', envelope.paintStyles]);
  if (envelope.textStyles !== undefined) entries.push(['textStyles', envelope.textStyles]);
  if (envelope.effectStyles !== undefined) entries.push(['effectStyles', envelope.effectStyles]);
  if (envelope.gridStyles !== undefined) entries.push(['gridStyles', envelope.gridStyles]);
  if (envelope.components !== undefined) entries.push(['components', envelope.components]);

  for (let i = 0; i < entries.length; i++) {
    if (i > 0) stream.write(',');
    const [key, val] = entries[i]!;
    stream.write(JSON.stringify(key));
    stream.write(':');
    if (key === 'document') {
      writeDocumentToStream(stream, val as DocumentNode);
    } else {
      writeJsonValue(stream, val);
    }
  }
  stream.write('}\n');
}

function streamEnabled(): boolean {
  const raw = process.env.HFC_STREAM_SAVE;
  if (raw === undefined || raw === '') return true;
  return raw !== '0' && raw.toLowerCase() !== 'false';
}

export function jsonPrettyEnabled(): boolean {
  const raw = process.env.HFC_JSON_PRETTY;
  return raw === '1' || raw?.toLowerCase() === 'true';
}

/** Stream-serialize envelope to a temp file, then atomic rename (default save path). */
export async function atomicWriteJsonEnvelope(
  targetPath: string,
  envelope: FileEnvelope
): Promise<void> {
  if (!streamEnabled() || jsonPrettyEnabled()) {
    return atomicWriteJsonEnvelopeBuffered(targetPath, envelope);
  }

  const dir = dirname(targetPath);
  const base = basename(targetPath);
  const tmp = join(dir, `${base}.tmp-${randomBytes(8).toString('hex')}`);

  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(tmp, { encoding: 'utf8' });
    stream.on('error', reject);
    stream.on('finish', () => resolve());
    try {
      writeEnvelope(stream, envelope);
      stream.end();
    } catch (e) {
      stream.destroy();
      reject(e);
    }
  });

  try {
    const fd = openSync(tmp, 'r+');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, targetPath);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore missing tmp */
    }
    throw new PersistenceError(
      e instanceof Error ? e.message : String(e),
      targetPath,
      e
    );
  }
}

async function atomicWriteJsonEnvelopeBuffered(
  targetPath: string,
  envelope: FileEnvelope
): Promise<void> {
  const { atomicWriteFileUtf8 } = await import('./atomicWriteFile.js');
  const pretty = jsonPrettyEnabled();
  const bytes = pretty
    ? `${JSON.stringify(envelope, null, 2)}\n`
    : `${JSON.stringify(envelope)}\n`;
  await atomicWriteFileUtf8(targetPath, bytes);
}
