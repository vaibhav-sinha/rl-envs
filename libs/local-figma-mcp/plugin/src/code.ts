import { PLUGIN_VERSION } from './utils.js';
import { runGetMetadata } from './tools/getMetadata.js';
import { runGetScreenshot } from './tools/getScreenshot.js';
import { runGetVariableDefs } from './tools/getVariableDefs.js';
import { runSearchDesignSystem } from './tools/searchDesignSystem.js';
import { runUseFigma } from './tools/useFigma.js';
import { buildFigmaPluginSnapshot, chunkSnapshotJson } from './tools/exportFile.js';
import { getSelectedNodeIds, getSingleSelectedNode } from './selection.js';

figma.showUI(__html__, { width: 480, height: 640, themeColors: true });

type UiToMain =
  | { type: 'request_hello' }
  | { type: 'tool_request'; id: string; tool: string; args: Record<string, unknown> }
  | { type: 'ui_log'; line: string }
  | { type: 'export_file'; hfcFileName: string; excludeNodeIds?: string[] }
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
  | { type: 'export_progress'; phase: string; detail?: string }
  | { type: 'export_file_result'; ok: boolean; hfcFileName?: string; snapshotJson?: string; error?: string }
  | { type: 'export_file_chunk'; index: number; total: number; data: string; hfcFileName: string }
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

async function runExportFile(hfcFileName: string, excludeNodeIds?: string[]): Promise<void> {
  try {
    figma.ui.postMessage({
      type: 'export_progress',
      phase: 'serialize',
      detail: 'Reading document…',
    } satisfies MainToUi);

    const snapshot = await buildFigmaPluginSnapshot({ excludeNodeIds });
    const json = JSON.stringify(snapshot);
    const chunks = chunkSnapshotJson(json);
    const name = hfcFileName.trim() || figma.root.name;

    if (chunks.length === 1) {
      figma.ui.postMessage({
        type: 'export_file_result',
        ok: true,
        hfcFileName: name,
        snapshotJson: chunks[0],
      } satisfies MainToUi);
    } else {
      for (let i = 0; i < chunks.length; i++) {
        figma.ui.postMessage({
          type: 'export_file_chunk',
          index: i,
          total: chunks.length,
          data: chunks[i]!,
          hfcFileName: name,
        } satisfies MainToUi);
      }
      figma.ui.postMessage({
        type: 'export_file_result',
        ok: true,
        hfcFileName: name,
      } satisfies MainToUi);
    }

    figma.notify('Export snapshot ready — uploading to HFC…');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    figma.ui.postMessage({
      type: 'export_file_result',
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

  if (msg.type === 'export_file') {
    void runExportFile(msg.hfcFileName, msg.excludeNodeIds);
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
