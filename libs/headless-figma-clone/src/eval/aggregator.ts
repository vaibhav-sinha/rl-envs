import { DEFAULT_WEIGHTS } from './types.js';
import type { EvalReport, EvalSpec, EvalWeights, SubCheckResult } from './types.js';

function weightedMean(items: SubCheckResult[]): number {
  let sum = 0;
  let w = 0;
  for (const item of items) {
    if (!item.applicable) continue;
    sum += item.score * item.weight;
    w += item.weight;
  }
  return w > 0 ? sum / w : 1;
}

export function aggregateScores(
  spec: EvalSpec,
  subchecks: SubCheckResult[],
  completionGate: number
): EvalReport {
  const weights: Required<EvalWeights> = {
    ...DEFAULT_WEIGHTS,
    ...spec.weights,
  };

  const byCategory = (cat: SubCheckResult['category']) =>
    subchecks.filter((s) => s.category === cat);

  const categoryScores: { key: keyof EvalWeights; score: number; weight: number }[] = [];

  const gatesItems = byCategory('gates');
  if (gatesItems.some((g) => g.applicable)) {
    categoryScores.push({ key: 'gates', score: weightedMean(gatesItems), weight: weights.gates });
  }

  const checksItems = byCategory('checks');
  if (checksItems.length > 0) {
    categoryScores.push({ key: 'checks', score: weightedMean(checksItems), weight: weights.checks });
  }

  const dsItems = byCategory('design_system');
  if (dsItems.some((d) => d.applicable)) {
    categoryScores.push({
      key: 'design_system',
      score: weightedMean(dsItems),
      weight: weights.design_system,
    });
  }

  const visualItems = byCategory('visual');
  if (visualItems.length > 0) {
    categoryScores.push({ key: 'visual', score: weightedMean(visualItems), weight: weights.visual });
  }

  const heurItems = byCategory('heuristics');
  if (heurItems.some((h) => h.applicable)) {
    categoryScores.push({ key: 'heuristics', score: weightedMean(heurItems), weight: weights.heuristics });
  }

  let wSum = 0;
  let raw = 0;
  for (const c of categoryScores) {
    raw += c.score * c.weight;
    wSum += c.weight;
  }
  raw = wSum > 0 ? raw / wSum : 0;

  const score = Math.max(0, Math.min(10, completionGate * raw * 10));

  return {
    score,
    completion_gate: completionGate,
    raw,
    subchecks,
  };
}

export function computeCompletionGate(
  gateResults: SubCheckResult[],
  checkResults: SubCheckResult[],
  spec: EvalSpec
): number {
  let gate = 1;

  for (const g of gateResults) {
    if (!g.applicable) continue;
    if (g.score < 1) gate = Math.min(gate, 0.2);
  }

  for (const c of spec.checks ?? []) {
    if (c.required === false) continue;
    const result = checkResults.find((r) => r.id === `check.${c.id}`);
    if (result && result.score < 1) {
      gate = Math.min(gate, 0.3);
    }
  }

  return gate;
}
