import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  McpContent,
  PluginHelloMessage,
  ServerToPluginMessage,
  ToolName,
  ToolResponseMessage,
} from './protocol.js';
import { isPluginToServerMessage } from './protocol.js';

export interface PluginSession {
  fileKey: string;
  fileName: string;
  pluginVersion: string;
}

type PendingRequest = {
  resolve: (content: McpContent[]) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class PluginBridge {
  private socket: WebSocket | null = null;
  private session: PluginSession | null = null;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(private readonly defaultTimeoutMs: number) {}

  get connected(): boolean {
    return this.socket !== null && this.session !== null && this.socket.readyState === 1;
  }

  getSession(): PluginSession | null {
    return this.session;
  }

  attach(socket: WebSocket): void {
    if (this.socket && this.socket !== socket && this.socket.readyState === 1) {
      this.socket.close(4000, 'Replaced by new plugin connection');
    }
    this.detachSocketOnly();
    this.socket = socket;
    socket.on('message', (data) => this.onMessage(socket, data));
    socket.on('close', () => {
      if (this.socket === socket) {
        this.detachSocketOnly();
        this.rejectAllPending(new Error('PLUGIN_DISCONNECTED'));
      }
    });
    socket.on('error', () => {
      /* close handler cleans up */
    });
  }

  private detachSocketOnly(): void {
    this.socket = null;
    this.session = null;
  }

  private onMessage(socket: WebSocket, data: WebSocket.RawData): void {
    if (this.socket !== socket) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      return;
    }
    if (!isPluginToServerMessage(parsed)) return;

    if (parsed.type === 'plugin_hello') {
      this.session = {
        fileKey: parsed.fileKey,
        fileName: parsed.fileName,
        pluginVersion: parsed.pluginVersion,
      };
      return;
    }

    if (parsed.type === 'pong') return;

    if (parsed.type === 'tool_response') {
      this.finishRequest(parsed);
    }
  }

  private finishRequest(msg: ToolResponseMessage): void {
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(msg.id);
    if (msg.ok) {
      pending.resolve(msg.content);
    } else {
      pending.reject(new Error(`${msg.error.code}: ${msg.error.message}`));
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(err);
      this.pending.delete(id);
    }
  }

  private send(msg: ServerToPluginMessage): void {
    if (!this.socket || this.socket.readyState !== 1) {
      throw new Error('PLUGIN_NOT_CONNECTED');
    }
    this.socket.send(JSON.stringify(msg));
  }

  call(tool: ToolName, args: Record<string, unknown>, timeoutMs?: number): Promise<McpContent[]> {
    if (!this.connected) {
      return Promise.reject(
        new Error(
          'PLUGIN_NOT_CONNECTED: Open Figma Desktop, run the Local Figma MCP plugin, and ensure the WebSocket shows Connected.'
        )
      );
    }
    const id = randomUUID();
    const ms = timeoutMs ?? this.defaultTimeoutMs;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`TOOL_TIMEOUT: ${tool} did not respond within ${ms}ms`));
      }, ms);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.send({ type: 'tool_request', id, tool, args });
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  handleScreenshotUpload(
    requestId: string,
    token: string,
    baseUrl: string
  ): McpContent[] {
    const url = `${baseUrl}/assets/${token}`;
    const curl = `curl -sS "${url}" -o screenshot.png`;
    return [
      {
        type: 'text',
        text: JSON.stringify({
          requestId,
          url,
          curl,
          hint: 'Download the PNG with the curl command above. Set enableBase64Response:true if URL fetch is unavailable.',
        }),
      },
    ];
  }
}

export function parsePluginHello(msg: unknown): PluginHelloMessage | null {
  if (!msg || typeof msg !== 'object') return null;
  const m = msg as PluginHelloMessage;
  if (m.type !== 'plugin_hello') return null;
  if (typeof m.fileKey !== 'string' || typeof m.fileName !== 'string') return null;
  return m;
}
