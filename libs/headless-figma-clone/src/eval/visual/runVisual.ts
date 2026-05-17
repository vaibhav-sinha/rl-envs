import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { FileEnvelope } from '../../model/types.js';
import { bufferPHashSimilarity, renderNodeToFile, resolveFocusNodeId } from '../renderService.js';
import type { EvalVisualSpec, SubCheckResult } from '../types.js';
import { nodeExists } from '../tree.js';
import { buildVisualPrompt } from './prompts.js';

const STAGE1_FAIL_CAP = 0.2;

function visualResult(
  spec: EvalVisualSpec,
  score: number,
  details?: Record<string, unknown>
): SubCheckResult {
  return {
    id: `visual.${spec.id}`,
    category: 'visual',
    score,
    applicable: true,
    weight: 1,
    details,
  };
}

async function runLlmJudge(params: {
  prompt: string;
  images: { role: string; path: string }[];
  model: string;
  judgeScript: string;
}): Promise<{ score: number; dimensions?: Record<string, number>; raw?: unknown }> {
  const payload = JSON.stringify({
    model: params.model,
    prompt: params.prompt,
    images: await Promise.all(
      params.images.map(async (img) => ({
        role: img.role,
        data: (await readFile(img.path)).toString('base64'),
        mime_type: 'image/png',
      }))
    ),
    dimensions: [
      'spacing',
      'typography',
      'color',
      'pattern',
      'alignment',
      'hierarchy',
    ],
  });

  return new Promise((resolve, reject) => {
    const child = spawn('python', [params.judgeScript], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`judge.py failed (${code}): ${stderr}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as { mean_score: number; dimensions?: Record<string, number> };
        resolve({ score: parsed.mean_score, dimensions: parsed.dimensions, raw: parsed });
      } catch (e) {
        reject(new Error(`judge output parse error: ${stdout} ${stderr}`));
      }
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

export async function runVisualCheck(params: {
  spec: EvalVisualSpec;
  before: FileEnvelope;
  after: FileEnvelope;
  beforePath: string;
  afterPath: string;
  workDir: string;
  assetsDir?: string;
  skipLlm?: boolean;
  judgeScript: string;
  model: string;
}): Promise<SubCheckResult> {
  const { spec } = params;

  if (!nodeExists(params.after, spec.region_id)) {
    return visualResult(spec, STAGE1_FAIL_CAP, { stage1: 'region_missing_in_after' });
  }

  const beforeRegionPath = join(params.workDir, `${spec.id}-before.png`);
  const afterRegionPath = join(params.workDir, `${spec.id}-after.png`);

  await renderNodeToFile({
    envelope: params.before,
    envelopePath: params.beforePath,
    nodeId: spec.region_id,
    outPath: beforeRegionPath,
  });
  await renderNodeToFile({
    envelope: params.after,
    envelopePath: params.afterPath,
    nodeId: spec.region_id,
    outPath: afterRegionPath,
  });

  const beforeBuf = await readFile(beforeRegionPath);
  const afterBuf = await readFile(afterRegionPath);
  const identical = bufferPHashSimilarity(beforeBuf, afterBuf) >= 1;

  if (identical) {
    return visualResult(spec, STAGE1_FAIL_CAP, { stage1: 'no_visible_change' });
  }

  if (spec.mode === 'match_asset') {
    if (!spec.reference_asset) {
      return visualResult(spec, STAGE1_FAIL_CAP, { stage1: 'missing_reference_asset' });
    }
    const refPath = spec.reference_asset.startsWith('/')
      ? spec.reference_asset
      : join(params.assetsDir ?? '/app/assets', spec.reference_asset);
    try {
      await readFile(refPath);
    } catch {
      return visualResult(spec, STAGE1_FAIL_CAP, { stage1: 'reference_file_missing', path: refPath });
    }
  }

  if (params.skipLlm) {
    return visualResult(spec, 0.75, { stage1: 'pass', llm: 'skipped' });
  }

  const focusNodeId = resolveFocusNodeId(
    params.before,
    params.after,
    spec.region_id,
    spec.focus ?? 'largest_added'
  );
  const focusPath = join(params.workDir, `${spec.id}-focus.png`);
  await renderNodeToFile({
    envelope: params.after,
    envelopePath: params.afterPath,
    nodeId: focusNodeId,
    outPath: focusPath,
  });

  const images: { role: string; path: string }[] = [
    { role: 'before', path: beforeRegionPath },
    { role: 'after', path: afterRegionPath },
    { role: 'focus', path: focusPath },
  ];

  if (spec.mode === 'match_asset') {
    const refPath = spec.reference_asset!.startsWith('/')
      ? spec.reference_asset!
      : join(params.assetsDir ?? '/app/assets', spec.reference_asset!);
    images.push({ role: 'reference', path: refPath });
  }

  const prompt = buildVisualPrompt(spec);
  const llm = await runLlmJudge({
    prompt,
    images,
    model: params.model,
    judgeScript: params.judgeScript,
  });

  return visualResult(spec, llm.score, { stage1: 'pass', llm: llm.dimensions });
}

export async function runAllVisualChecks(params: {
  specs: EvalVisualSpec[] | undefined;
  before: FileEnvelope;
  after: FileEnvelope;
  beforePath: string;
  afterPath: string;
  workDir: string;
  assetsDir?: string;
  skipLlm?: boolean;
  judgeScript: string;
  model: string;
  parallel: number;
}): Promise<SubCheckResult[]> {
  if (!params.specs?.length) return [];

  const { runWithConcurrency } = await import('../renderService.js');
  const tasks = params.specs.map(
    (spec) => () =>
      runVisualCheck({
        spec,
        before: params.before,
        after: params.after,
        beforePath: params.beforePath,
        afterPath: params.afterPath,
        workDir: params.workDir,
        assetsDir: params.assetsDir,
        skipLlm: params.skipLlm,
        judgeScript: params.judgeScript,
        model: params.model,
      })
  );

  return runWithConcurrency(tasks, params.parallel);
}
