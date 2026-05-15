import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PluginBridge } from '../bridge/PluginBridge.js';
import type { ScreenshotAssetStore } from '../bridge/ScreenshotAssetStore.js';
import type { McpContent } from '../bridge/protocol.js';
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

function mergeScreenshotAsset(
  bridge: PluginBridge,
  store: ScreenshotAssetStore,
  baseUrl: string,
  content: McpContent[],
  enableBase64: boolean
): McpContent[] {
  const out: McpContent[] = [];
  for (const c of content) {
    if (c.type === 'text') {
      try {
        const parsed = JSON.parse(c.text) as {
          _screenshotBase64?: string;
          _screenshotMimeType?: string;
          requestId?: string;
        };
        if (parsed._screenshotBase64 && parsed._screenshotMimeType) {
          const bytes = Buffer.from(parsed._screenshotBase64, 'base64');
          const token = store.put(bytes, parsed._screenshotMimeType);
          const { requestId, _screenshotBase64: _, _screenshotMimeType: __, ...meta } = parsed;
          const urlContent = bridge.handleScreenshotUpload(requestId ?? '', token, baseUrl);
          const urlText = urlContent[0]?.type === 'text' ? urlContent[0].text : '{}';
          out.push({
            type: 'text',
            text: JSON.stringify({ ...meta, ...JSON.parse(urlText) }),
          });
          if (enableBase64) {
            out.push({
              type: 'image',
              data: parsed._screenshotBase64,
              mimeType: parsed._screenshotMimeType,
            });
          }
          continue;
        }
      } catch {
        /* plain text */
      }
    }
    out.push(c);
  }
  return out;
}

export interface RegisterToolsDeps {
  bridge: PluginBridge;
  screenshotStore: ScreenshotAssetStore;
  getBaseUrl: () => string;
}

export function registerLocalFigmaTools(server: McpServer, deps: RegisterToolsDeps): void {
  const { bridge, screenshotStore, getBaseUrl } = deps;

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
    async (args) => {
      try {
        const raw = await bridge.call('get_screenshot', args);
        const enableBase64 = args.enableBase64Response === true;
        const content = mergeScreenshotAsset(bridge, screenshotStore, getBaseUrl(), raw, enableBase64);
        return { content };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          content: [{ type: 'text' as const, text: toolErrorText('TOOL_ERROR', msg) }],
          isError: true,
        };
      }
    }
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
