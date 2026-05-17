import { mkdir, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateScores, computeCompletionGate } from './aggregator.js';
import { buildCatalog } from './catalog.js';
import { runAllChecks } from './checks/runChecks.js';
import { runDesignSystemChecks } from './designSystem.js';
import { buildEditGraph } from './editGraph.js';
import { runGates } from './gates.js';
import { runHeuristics } from './heuristics.js';
import { loadEnvelopeFromPath } from './loadEnvelope.js';
import { loadAndValidateEvalSpec } from './schema.js';
import type { EvalReport } from './types.js';
import { runAllVisualChecks } from './visual/runVisual.js';

export interface EvalRunOptions {
  beforePath: string;
  afterPath: string;
  specPath: string;
  reportPath: string;
  assetsDir?: string;
  parallel?: number;
  skipLlm?: boolean;
  workDir?: string;
}

function defaultJudgeScript(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', 'eval-llm', 'judge.py');
}

export async function runEval(options: EvalRunOptions): Promise<EvalReport> {
  const spec = loadAndValidateEvalSpec(options.specPath);
  const before = loadEnvelopeFromPath(options.beforePath);
  const after = loadEnvelopeFromPath(options.afterPath);
  const graph = buildEditGraph(before, after);
  const catalog = buildCatalog(before);

  const workDir = options.workDir ?? (await mkdtemp(join(tmpdir(), 'hfc-eval-')));
  await mkdir(workDir, { recursive: true });

  const parallel = options.parallel ?? 4;
  const model = process.env.EVAL_JUDGE_MODEL ?? 'anthropic/claude-sonnet-4-6';
  const judgeScript = process.env.EVAL_JUDGE_SCRIPT ?? defaultJudgeScript();

  const gateResults = runGates(before, after, graph, spec.gates);
  const checkResults = runAllChecks(spec.checks, before, after, catalog);
  const designResults = runDesignSystemChecks(before, after, graph, catalog);
  const heuristicResults = runHeuristics(before, after, graph);

  const visualResults = await runAllVisualChecks({
    specs: spec.visual,
    before,
    after,
    beforePath: options.beforePath,
    afterPath: options.afterPath,
    workDir,
    assetsDir: options.assetsDir,
    skipLlm: options.skipLlm,
    judgeScript,
    model,
    parallel,
  });

  const subchecks = [
    ...gateResults,
    ...checkResults,
    ...designResults,
    ...heuristicResults,
    ...visualResults,
  ];

  const completionGate = computeCompletionGate(gateResults, checkResults, spec);
  const report = aggregateScores(spec, subchecks, completionGate);

  await mkdir(dirname(options.reportPath), { recursive: true });
  await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return report;
}

export async function runEvalDiff(beforePath: string, afterPath: string, outPath: string): Promise<void> {
  const before = loadEnvelopeFromPath(beforePath);
  const after = loadEnvelopeFromPath(afterPath);
  const graph = buildEditGraph(before, after);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    `${JSON.stringify(
      {
        equal: graph.equal,
        changes: graph.changes,
        added_ids: [...graph.addedIds],
        deleted_ids: [...graph.deletedIds],
        modified_ids: [...graph.modifiedIds],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}
