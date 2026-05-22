import type { DocumentEngine, TransactionFailure, TransactionResult } from '../../src/engine/DocumentEngine.js';
import type { RunUseFigmaScriptOk } from '../../src/mcp/useFigmaScript.js';

/** Commit a use_figma script run without replaying ops already applied in the sandbox. */
export async function commitScriptRun(
  engine: DocumentEngine,
  run: RunUseFigmaScriptOk
): Promise<TransactionResult | TransactionFailure> {
  if (run.preApplied && run.committedWorking) {
    return engine.commitEnvelope(run.committedWorking, {
      touchedNodeIds: run.touchedNodeIds,
    });
  }
  if (run.operations.length === 0) {
    return { success: true, touchedNodeIds: run.touchedNodeIds ?? [], warnings: [] };
  }
  return engine.applyTransaction(run.operations);
}

/** Envelope after script execution (pre-applied working copy when available). */
export function envelopeAfterScriptRun(engine: DocumentEngine, run: RunUseFigmaScriptOk) {
  return run.committedWorking ?? engine.getActiveFile()!;
}
