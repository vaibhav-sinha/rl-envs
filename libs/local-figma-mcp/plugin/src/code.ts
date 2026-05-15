import { PLUGIN_VERSION } from './utils.js';
import { runGetMetadata } from './tools/getMetadata.js';
import { runGetScreenshot } from './tools/getScreenshot.js';
import { runGetVariableDefs } from './tools/getVariableDefs.js';
import { runSearchDesignSystem } from './tools/searchDesignSystem.js';
import { runUseFigma } from './tools/useFigma.js';

figma.showUI(__html__, { width: 420, height: 520, themeColors: true });

type UiToMain =
  | { type: 'request_hello' }
  | { type: 'tool_request'; id: string; tool: string; args: Record<string, unknown> }
  | { type: 'ui_log'; line: string };

type MainToUi =
  | { type: 'hello_data'; fileKey: string; fileName: string; pluginVersion: string }
  | {
      type: 'tool_response';
      id: string;
      ok: boolean;
      content?: { type: string; text?: string; data?: string; mimeType?: string }[];
      error?: { code: string; message: string };
    }
  | { type: 'log'; line: string };

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
