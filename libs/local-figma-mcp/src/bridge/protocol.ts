export const TOOL_NAMES = [
  'get_metadata',
  'get_screenshot',
  'get_variable_defs',
  'search_design_system',
  'use_figma',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type McpTextContent = { type: 'text'; text: string };
export type McpImageContent = { type: 'image'; data: string; mimeType: string };
export type McpContent = McpTextContent | McpImageContent;

export type PluginHelloMessage = {
  type: 'plugin_hello';
  pluginVersion: string;
  fileKey: string;
  fileName: string;
};

export type ToolRequestMessage = {
  type: 'tool_request';
  id: string;
  tool: ToolName;
  args: Record<string, unknown>;
};

export type ToolResponseMessage =
  | {
      type: 'tool_response';
      id: string;
      ok: true;
      content: McpContent[];
    }
  | {
      type: 'tool_response';
      id: string;
      ok: false;
      error: { code: string; message: string };
    };

export type PingMessage = { type: 'ping' };
export type PongMessage = { type: 'pong' };

export type ServerToPluginMessage = ToolRequestMessage | PingMessage;
export type PluginToServerMessage = PluginHelloMessage | ToolResponseMessage | PongMessage;

export function isPluginToServerMessage(v: unknown): v is PluginToServerMessage {
  if (!v || typeof v !== 'object') return false;
  const t = (v as { type?: string }).type;
  return (
    t === 'plugin_hello' ||
    t === 'tool_response' ||
    t === 'pong'
  );
}
