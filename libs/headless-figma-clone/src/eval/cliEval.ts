import { writeFile } from 'node:fs/promises';
import { getEvalSpecJsonSchema } from './schema.js';
import { loadEnvelopeFromPath } from './loadEnvelope.js';
import { renderNodeToFile } from './renderService.js';
import { runEval, runEvalDiff } from './run.js';

function parseFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return undefined;
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export async function handleEvalCli(argv: string[]): Promise<void> {
  const sub = argv[2];
  if (!sub || sub === '--help' || sub === '-h') {
    // eslint-disable-next-line no-console
    console.log(`Usage:
  hfc eval run --before <path> --after <path> --spec <path> --report <path> [--assets-dir <dir>] [--parallel N] [--skip-llm]
  hfc eval render --file <path> --node <id> --out <path> [--before <path>] [--after <path>] [--focus <mode>]
  hfc eval diff --before <path> --after <path> --out <path>
  hfc eval schema [--out <path>]
`);
    process.exit(sub ? 0 : 1);
  }

  if (sub === 'schema') {
    const schema = getEvalSpecJsonSchema();
    const out = parseFlag(argv, '--out');
    const text = `${JSON.stringify(schema, null, 2)}\n`;
    if (out) {
      await writeFile(out, text, 'utf8');
    } else {
      // eslint-disable-next-line no-console
      console.log(text);
    }
    return;
  }

  if (sub === 'diff') {
    const before = parseFlag(argv, '--before');
    const after = parseFlag(argv, '--after');
    const out = parseFlag(argv, '--out');
    if (!before || !after || !out) {
      throw new Error('eval diff requires --before, --after, --out');
    }
    await runEvalDiff(before, after, out);
    return;
  }

  if (sub === 'render') {
    const file = parseFlag(argv, '--file');
    const node = parseFlag(argv, '--node');
    const out = parseFlag(argv, '--out');
    if (!file || !node || !out) {
      throw new Error('eval render requires --file, --node, --out');
    }
    const envelope = loadEnvelopeFromPath(file);
    await renderNodeToFile({ envelope, envelopePath: file, nodeId: node, outPath: out });
    return;
  }

  if (sub === 'run') {
    const before = parseFlag(argv, '--before');
    const after = parseFlag(argv, '--after');
    const spec = parseFlag(argv, '--spec');
    const report = parseFlag(argv, '--report');
    if (!before || !after || !spec || !report) {
      throw new Error('eval run requires --before, --after, --spec, --report');
    }
    const parallel = Number.parseInt(parseFlag(argv, '--parallel') ?? '4', 10);
    const reportResult = await runEval({
      beforePath: before,
      afterPath: after,
      specPath: spec,
      reportPath: report,
      assetsDir: parseFlag(argv, '--assets-dir'),
      parallel: Number.isFinite(parallel) ? parallel : 4,
      skipLlm: hasFlag(argv, '--skip-llm'),
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ score: reportResult.score, completion_gate: reportResult.completion_gate }));
    return;
  }

  throw new Error(`Unknown eval subcommand: ${sub}`);
}
