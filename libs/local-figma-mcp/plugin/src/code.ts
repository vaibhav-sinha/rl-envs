import { PLUGIN_VERSION } from './utils.js';
import { runGetMetadata } from './tools/getMetadata.js';
import { runGetScreenshot } from './tools/getScreenshot.js';
import { runGetVariableDefs } from './tools/getVariableDefs.js';
import { runSearchDesignSystem } from './tools/searchDesignSystem.js';
import { runUseFigma } from './tools/useFigma.js';
import { streamFigmaExportLines } from './tools/streamExport.js';
import { exportPercent } from './streamProtocol.js';
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
    }
  | { type: 'export_stream_ack'; seq: number }
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
  | {
      type: 'export_progress';
      phase: 'count' | 'meta' | 'serialize' | 'icons' | 'images' | 'upload';
      current: number;
      total: number;
      percent: number;
      detail?: string;
    }
  | { type: 'export_stream_part'; exportId: string; seq: number; line: string }
  | { type: 'export_stream_done'; ok: boolean; exportId?: string; error?: string }
  | { type: 'selection_node_id'; nodeId: string; name: string }
  | { type: 'selection_node_ids'; nodeIds: string[] }
  | { type: 'selection_error'; message: string }
  | {
      type: 'selection_screenshot';
      ok: boolean;
      data?: string;
      mimeType?: string;
      error?: string;
    };

let ackWaiter: ((seq: number) => void) | null = null;

function waitForStreamAck(seq: number): Promise<void> {
  return new Promise((resolve) => {
    ackWaiter = (acked) => {
      if (acked >= seq) {
        ackWaiter = null;
        resolve();
      }
    };
  });
}

function postProgress(
  phase: 'count' | 'meta' | 'serialize' | 'icons' | 'images' | 'upload',
  current: number,
  total: number,
  detail?: string
): void {
  figma.ui.postMessage({
    type: 'export_progress',
    phase,
    current,
    total,
    percent: exportPercent(current, total),
    detail,
  } satisfies MainToUi);
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

function estimateStreamPartTotal(totals: {
  nodes: number;
  iconExports: number;
  rasterImages: number;
}): number {
  return Math.max(1, totals.nodes * 2 + totals.iconExports + totals.rasterImages + 3);
}

function parseSessionStartTotals(line: string): {
  nodes: number;
  iconExports: number;
  rasterImages: number;
} | null {
  try {
    const part = JSON.parse(line.trim()) as {
      kind?: string;
      totals?: { nodes?: number; iconExports?: number; rasterImages?: number };
    };
    if (part.kind !== 'session_start' || !part.totals) return null;
    return {
      nodes: part.totals.nodes ?? 0,
      iconExports: part.totals.iconExports ?? 0,
      rasterImages: part.totals.rasterImages ?? 0,
    };
  } catch {
    return null;
  }
}

async function runExportFile(
  exportId: string,
  hfcFileName: string,
  excludeNodeIds?: string[]
): Promise<void> {
  try {
    let uploadCurrent = 0;
    let uploadTotal = 1;

    for await (const line of streamFigmaExportLines(
      exportId,
      hfcFileName,
      { excludeNodeIds },
      {
        onProgress: (phase, current, total, detail) => {
          postProgress(phase, current, total, detail);
        },
      }
    )) {
      const totals = parseSessionStartTotals(line);
      if (totals) {
        uploadTotal = estimateStreamPartTotal(totals);
      }

      uploadCurrent += 1;
      if (uploadCurrent > uploadTotal) {
        uploadTotal = uploadCurrent;
      }
      const shouldReportUpload =
        uploadCurrent === 1 ||
        uploadCurrent >= uploadTotal ||
        uploadCurrent % 250 === 0;
      if (shouldReportUpload) {
        postProgress(
          'upload',
          uploadCurrent,
          uploadTotal,
          'NDJSON parts (~2× node count)'
        );
      }

      figma.ui.postMessage({
        type: 'export_stream_part',
        exportId,
        seq: uploadCurrent,
        line,
      } satisfies MainToUi);
      await waitForStreamAck(uploadCurrent);
    }

    postProgress('upload', uploadTotal, uploadTotal);

    figma.ui.postMessage({
      type: 'export_stream_done',
      ok: true,
      exportId,
    } satisfies MainToUi);
    figma.notify('Export streamed — finalizing…');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    figma.ui.postMessage({
      type: 'export_stream_done',
      ok: false,
      error: message,
    } satisfies MainToUi);
    figma.notify('Export failed: ' + message, { error: true });
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
    ackWaiter?.(msg.seq);
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
    void runExportFile(msg.exportId, msg.hfcFileName, msg.excludeNodeIds);
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
