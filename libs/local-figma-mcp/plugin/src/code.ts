import { PLUGIN_VERSION } from './utils.js';
import { runGetMetadata } from './tools/getMetadata.js';
import { runGetScreenshot } from './tools/getScreenshot.js';
import { runGetVariableDefs } from './tools/getVariableDefs.js';
import { runSearchDesignSystem } from './tools/searchDesignSystem.js';
import { runUseFigma } from './tools/useFigma.js';
import { runFigmaStreamExport } from './tools/streamExport.js';
import { formatExportError, logExportError } from './exportError.js';
import { ExportMetricsCollector } from './exportMetrics.js';
import { ExportUploadGate } from './exportUploadGate.js';
import { ExportProgressReporter } from './exportProgressReporter.js';
import type { ExportProgressSnapshot } from './exportProgressSnapshot.js';
import { listFilePages } from './exportScope.js';
import { getSelectedNodeIds, getSingleSelectedNode } from './selection.js';

figma.showUI(__html__, { width: 480, height: 640, themeColors: true });

type UiToMain =
  | { type: 'request_hello' }
  | { type: 'tool_request'; id: string; tool: string; args: Record<string, unknown> }
  | { type: 'ui_log'; line: string }
  | {
      type: 'export_file';
      hfcFileName: string;
      exportId: string;
      excludeNodeIds?: string[];
      includePageIds?: string[];
    }
  | { type: 'get_file_pages' }
  | { type: 'export_stream_ack'; seq: number }
  | { type: 'export_stream_upload_failed'; exportId: string; seq: number; error: string }
  | { type: 'get_selection_node_id' }
  | { type: 'get_selection_node_ids' }
  | { type: 'capture_selection_screenshot' };

type MainToUi =
  | { type: 'hello_data'; fileKey: string; fileName: string; pluginVersion: string }
  | {
      type: 'tool_response';
      id: string;
      ok: boolean;
      content?: { type: string; text?: string; data?: string; mimeType?: string }[];
      error?: { code: string; message: string };
    }
  | { type: 'log'; line: string }
  | { type: 'export_progress_v2'; snapshot: ExportProgressSnapshot }
  | { type: 'export_stream_part'; exportId: string; seq: number; line: string }
  | { type: 'export_stream_batch'; exportId: string; seq: number; lines: string[] }
  | { type: 'export_stream_done'; ok: boolean; exportId?: string; error?: string }
  | { type: 'selection_node_id'; nodeId: string; name: string }
  | { type: 'selection_node_ids'; nodeIds: string[] }
  | { type: 'file_pages'; pages: { id: string; name: string }[] }
  | { type: 'pages_error'; message: string }
  | { type: 'selection_error'; message: string }
  | {
      type: 'selection_screenshot';
      ok: boolean;
      data?: string;
      mimeType?: string;
      error?: string;
    };

const STREAM_ACK_TIMEOUT_MS = 120_000;

let ackWaiter: ((seq: number) => void) | null = null;
let uploadAbortError: string | null = null;
let activeExportGate: ExportUploadGate | null = null;

function waitForStreamAck(seq: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ackWaiter = null;
      const err = new Error(
        `Upload ack timed out waiting for seq ${seq} (UI may have failed posting to Task Builder)`
      );
      logExportError(`main/waitForStreamAck seq=${seq}`, err);
      reject(err);
    }, STREAM_ACK_TIMEOUT_MS);

    ackWaiter = (acked) => {
      if (uploadAbortError) {
        clearTimeout(timer);
        ackWaiter = null;
        const msg = uploadAbortError;
        uploadAbortError = null;
        const err = new Error(msg);
        logExportError('main/waitForStreamAck/uploadAbort', err);
        reject(err);
        return;
      }
      if (acked >= seq) {
        clearTimeout(timer);
        ackWaiter = null;
        resolve();
      }
    };
  });
}

/** Progress-only posts must never abort export (UI may be busy uploading large assets). */
function postProgressSnapshot(snapshot: ExportProgressSnapshot): void {
  try {
    figma.ui.postMessage({
      type: 'export_progress_v2',
      snapshot,
    } satisfies MainToUi);
  } catch (e) {
    logExportError('main/postProgressSnapshot', e, 'warn');
  }
}

function postUiMessage(msg: MainToUi): void {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      figma.ui.postMessage(msg);
      return;
    } catch (e) {
      lastError = e;
      logExportError(`main/postUiMessage/${msg.type} attempt ${attempt}`, e, 'warn');
    }
  }
  const wrapped = new Error(
    `Failed to send message to plugin UI (${msg.type}): ${formatExportError(lastError)}`
  );
  throw wrapped;
}

/** Best-effort post for teardown paths — must not throw (bridge may already be dead). */
function safePostUiMessage(msg: MainToUi): void {
  try {
    postUiMessage(msg);
  } catch (e) {
    logExportError(`main/safePostUiMessage/${msg.type}`, e, 'warn');
  }
}

async function dispatchTool(
  tool: string,
  args: Record<string, unknown>
): Promise<{ type: string; text?: string; data?: string; mimeType?: string }[]> {
  switch (tool) {
    case 'get_metadata':
      return runGetMetadata(args as { nodeId?: string });
    case 'get_screenshot':
      return runGetScreenshot(
        args as {
          nodeId: string;
          contentsOnly?: boolean;
          maxDimension?: number;
        }
      );
    case 'get_variable_defs':
      return runGetVariableDefs(args as { nodeId: string });
    case 'search_design_system':
      return runSearchDesignSystem(
        args as {
          query: string;
          includeComponents?: boolean;
          includeVariables?: boolean;
          includeStyles?: boolean;
          includeLibraryKeys?: string[];
        }
      );
    case 'use_figma':
      return runUseFigma(
        args as { code: string; description: string; skillNames?: string }
      );
    default:
      throw new Error(`UNKNOWN_TOOL: ${tool}`);
  }
}

async function runExportFile(
  exportId: string,
  hfcFileName: string,
  excludeNodeIds?: string[],
  includePageIds?: string[]
): Promise<void> {
  const metrics = new ExportMetricsCollector();
  let progressReporter: ExportProgressReporter;

  const gate = new ExportUploadGate({
    exportId,
    metrics,
    postMessage: (msg) => {
      postUiMessage(msg satisfies MainToUi);
    },
    onAbortError: () => uploadAbortError,
    onPosted: () => {
      try {
        progressReporter?.emit();
      } catch (e) {
        logExportError('main/onPostedProgress', e, 'warn');
      }
    },
  });

  progressReporter = new ExportProgressReporter(metrics, gate, postProgressSnapshot);

  activeExportGate = gate;

  try {
    await runFigmaStreamExport({
      exportId,
      hfcFileName,
      excludeNodeIds,
      includePageIds,
      gate,
      metrics,
      progress: progressReporter,
    });

    await gate.drain();
    progressReporter.emit(true);

    postUiMessage({
      type: 'export_stream_done',
      ok: true,
      exportId,
    } satisfies MainToUi);
    figma.notify('Export streamed — finalizing…');
  } catch (e) {
    const message = logExportError('main/runExportFile', e);
    try {
      progressReporter.emit(true);
    } catch (emitErr) {
      logExportError('main/runExportFile/emitProgress', emitErr, 'warn');
    }
    safePostUiMessage({
      type: 'export_stream_done',
      ok: false,
      error: message,
    } satisfies MainToUi);
    safePostUiMessage({
      type: 'log',
      line: `✗ [main/runExportFile] ${message}`,
    } satisfies MainToUi);
    figma.notify('Export failed: ' + message, { error: true });
  } finally {
    activeExportGate = null;
  }
}

figma.ui.onmessage = async (msg: UiToMain) => {
  if (msg.type === 'request_hello') {
    const payload: MainToUi = {
      type: 'hello_data',
      fileKey: figma.fileKey ?? '',
      fileName: figma.root.name,
      pluginVersion: PLUGIN_VERSION,
    };
    figma.ui.postMessage(payload);
    return;
  }

  if (msg.type === 'ui_log') {
    return;
  }

  if (msg.type === 'export_stream_ack') {
    activeExportGate?.handleAck(msg.seq);
    ackWaiter?.(msg.seq);
    return;
  }

  if (msg.type === 'export_stream_upload_failed') {
    const err = new Error(formatExportError(msg.error, 'Task Builder upload failed'));
    uploadAbortError = logExportError(`main/uploadFailed seq=${msg.seq}`, err);
    ackWaiter?.(Number.MAX_SAFE_INTEGER);
    return;
  }

  if (msg.type === 'export_file') {
    if (!msg.exportId?.trim()) {
      figma.ui.postMessage({
        type: 'export_stream_done',
        ok: false,
        error: 'exportId required for streaming export',
      } satisfies MainToUi);
      return;
    }
    void runExportFile(
      msg.exportId,
      msg.hfcFileName,
      msg.excludeNodeIds,
      msg.includePageIds
    ).catch((e) => {
      logExportError('main/runExportFile/unhandled', e);
    });
    return;
  }

  if (msg.type === 'get_file_pages') {
    try {
      figma.ui.postMessage({
        type: 'file_pages',
        pages: listFilePages(),
      } satisfies MainToUi);
    } catch (e) {
      figma.ui.postMessage({
        type: 'pages_error',
        message: formatExportError(e, 'Failed to list pages'),
      } satisfies MainToUi);
    }
    return;
  }

  if (msg.type === 'get_selection_node_id') {
    try {
      const node = getSingleSelectedNode();
      figma.ui.postMessage({
        type: 'selection_node_id',
        nodeId: node.id,
        name: node.name,
      } satisfies MainToUi);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      figma.ui.postMessage({
        type: 'selection_error',
        message,
      } satisfies MainToUi);
    }
    return;
  }

  if (msg.type === 'get_selection_node_ids') {
    try {
      const nodeIds = getSelectedNodeIds();
      figma.ui.postMessage({
        type: 'selection_node_ids',
        nodeIds,
      } satisfies MainToUi);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      figma.ui.postMessage({
        type: 'selection_error',
        message,
      } satisfies MainToUi);
    }
    return;
  }

  if (msg.type === 'capture_selection_screenshot') {
    try {
      const node = getSingleSelectedNode();
      const content = await runGetScreenshot({ nodeId: node.id });
      const img = content[0];
      figma.ui.postMessage({
        type: 'selection_screenshot',
        ok: true,
        data: img?.data,
        mimeType: img?.mimeType,
      } satisfies MainToUi);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      figma.ui.postMessage({
        type: 'selection_screenshot',
        ok: false,
        error: message,
      } satisfies MainToUi);
    }
    return;
  }

  if (msg.type === 'tool_request') {
    const started = Date.now();
    figma.ui.postMessage({
      type: 'log',
      line: `→ ${msg.tool} (${msg.id.slice(0, 8)}…)`,
    } satisfies MainToUi);

    try {
      const content = await dispatchTool(msg.tool, msg.args);
      const ms = Date.now() - started;
      figma.ui.postMessage({
        type: 'tool_response',
        id: msg.id,
        ok: true,
        content,
      } satisfies MainToUi);
      figma.ui.postMessage({
        type: 'log',
        line: `✓ ${msg.tool} ${ms}ms`,
      } satisfies MainToUi);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const code = message.startsWith('UNKNOWN_NODE')
          ? 'UNKNOWN_NODE'
          : message.startsWith('VALIDATION_ERROR')
            ? 'VALIDATION_ERROR'
            : 'TOOL_ERROR';
      figma.ui.postMessage({
        type: 'tool_response',
        id: msg.id,
        ok: false,
        error: { code, message },
      } satisfies MainToUi);
      figma.ui.postMessage({
        type: 'log',
        line: `✗ ${msg.tool}: ${message}`,
      } satisfies MainToUi);
    }
  }
};
