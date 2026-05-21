import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { atomicWriteFileUtf8 } from './atomicWriteFile.js';
import { PersistenceError } from '../util/errors.js';

const MAX_COMMAND_MESSAGE_LEN = 500;

export interface CommandIssue {
  success: boolean;
  errorCode?: string;
  message?: string;
  at: string;
}

export interface IssuesFileEnvelope {
  schema_version: 1;
  detached: unknown[];
  commands: CommandIssue[];
}

export function issuesPathForHfcFile(designPath: string): string {
  return join(dirname(designPath), 'issues.hfc.json');
}

function emptyIssuesFile(): IssuesFileEnvelope {
  return { schema_version: 1, detached: [], commands: [] };
}

function loadIssuesFile(path: string): IssuesFileEnvelope {
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return emptyIssuesFile();
    }
    const rec = parsed as Record<string, unknown>;
    const detached = Array.isArray(rec.detached) ? rec.detached : [];
    const commands = Array.isArray(rec.commands) ? (rec.commands as CommandIssue[]) : [];
    return { schema_version: 1, detached, commands };
  } catch (e) {
    if (e instanceof Error && 'code' in e && (e as NodeJS.ErrnoException).code === 'ENOENT') {
      return emptyIssuesFile();
    }
    throw new PersistenceError(
      e instanceof Error ? e.message : String(e),
      path,
      e
    );
  }
}

async function writeIssuesFile(issuesPath: string, file: IssuesFileEnvelope): Promise<void> {
  const bytes = `${JSON.stringify(file, null, 2)}\n`;
  await atomicWriteFileUtf8(issuesPath, bytes);
}

function truncateMessage(message: string | undefined): string | undefined {
  if (message === undefined) return undefined;
  if (message.length <= MAX_COMMAND_MESSAGE_LEN) return message;
  return `${message.slice(0, MAX_COMMAND_MESSAGE_LEN)}…`;
}

/** Append a use_figma command outcome next to the active design .hfc.json. */
export async function appendCommandIssue(
  designPath: string,
  entry: Omit<CommandIssue, 'at'> & { at?: string }
): Promise<void> {
  const issuesPath = issuesPathForHfcFile(designPath);
  const file = loadIssuesFile(issuesPath);
  const record: CommandIssue = {
    success: entry.success,
    at: entry.at ?? new Date().toISOString(),
  };
  if (!entry.success) {
    if (entry.errorCode !== undefined) record.errorCode = entry.errorCode;
    const msg = truncateMessage(entry.message);
    if (msg !== undefined) record.message = msg;
  }
  file.commands.push(record);
  await writeIssuesFile(issuesPath, file);
}

/** Append detached node snapshots next to the active design .hfc.json. */
export async function appendDetachedNodes(designPath: string, nodes: unknown[]): Promise<void> {
  if (nodes.length === 0) return;
  const issuesPath = issuesPathForHfcFile(designPath);
  const file = loadIssuesFile(issuesPath);
  for (const node of nodes) {
    file.detached.push(node);
  }
  await writeIssuesFile(issuesPath, file);
}
