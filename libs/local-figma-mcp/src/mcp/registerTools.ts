import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PluginBridge } from '../bridge/PluginBridge.js';
import {
  TOOL_DESCRIPTIONS,
  getMetadataInputSchema,
  getScreenshotInputSchema,
  getVariableDefsInputSchema,
  searchDesignSystemInputSchema,
  useFigmaInputSchema,
} from './toolDefinitions.js';

function toolErrorText(code: string, message: string): string {
  return JSON.stringify({ ok: false, error: { code, message } });
}

export interface RegisterToolsDeps {
  bridge: PluginBridge;
}

export function registerLocalFigmaTools(server: McpServer, deps: RegisterToolsDeps): void {
  const { bridge } = deps;

  async function proxyTool(
    tool: Parameters<PluginBridge['call']>[0],
    args: Record<string, unknown>
  ) {
    try {
      const content = await bridge.call(tool, args);
      return { content };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = msg.startsWith('PLUGIN_NOT_CONNECTED')
        ? 'PLUGIN_NOT_CONNECTED'
        : msg.startsWith('TOOL_TIMEOUT')
          ? 'TOOL_TIMEOUT'
          : 'TOOL_ERROR';
      return {
        content: [{ type: 'text' as const, text: toolErrorText(code, msg) }],
        isError: true,
      };
    }
  }

  server.registerTool(
    'get_metadata',
    {
      description: TOOL_DESCRIPTIONS.get_metadata,
      inputSchema: getMetadataInputSchema,
    },
    async (args) => proxyTool('get_metadata', args)
  );

  server.registerTool(
    'get_screenshot',
    {
      description: TOOL_DESCRIPTIONS.get_screenshot,
      inputSchema: getScreenshotInputSchema,
    },
    async (args) => proxyTool('get_screenshot', args)
  );

  server.registerTool(
    'get_variable_defs',
    {
      description: TOOL_DESCRIPTIONS.get_variable_defs,
      inputSchema: getVariableDefsInputSchema,
    },
    async (args) => proxyTool('get_variable_defs', args)
  );

  server.registerTool(
    'search_design_system',
    {
      description: TOOL_DESCRIPTIONS.search_design_system,
      inputSchema: searchDesignSystemInputSchema,
    },
    async (args) => proxyTool('search_design_system', args)
  );

  server.registerTool(
    'use_figma',
    {
      description: TOOL_DESCRIPTIONS.use_figma,
      inputSchema: useFigmaInputSchema,
    },
    async (args) => proxyTool('use_figma', args)
  );
}

export function createLocalFigmaMcpServer(deps: RegisterToolsDeps): McpServer {
  const server = new McpServer(
    { name: 'local-figma-mcp', version: '1.0.0' },
    { capabilities: { logging: {} } }
  );
  registerLocalFigmaTools(server, deps);
  return server;
}
