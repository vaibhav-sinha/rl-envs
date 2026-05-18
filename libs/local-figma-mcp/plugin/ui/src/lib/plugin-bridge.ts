export type PluginMessage =
  | { type: 'request_hello' }
  | { type: 'export_file'; hfcFileName: string; excludeNodeIds?: string[] }
  | { type: 'get_selection_node_id' }
  | { type: 'get_selection_node_ids' }
  | { type: 'capture_selection_screenshot' }
  | { type: 'tool_request'; id: string; tool: string; args: Record<string, unknown> };

export type PluginReply =
  | { type: 'hello_data'; fileKey: string; fileName: string; pluginVersion: string }
  | { type: 'log'; line: string }
  | { type: 'export_progress'; phase: string; detail?: string }
  | { type: 'export_file_chunk'; index: number; total: number; data: string; hfcFileName: string }
  | { type: 'export_file_result'; ok: boolean; hfcFileName?: string; snapshotJson?: string; error?: string }
  | { type: 'selection_node_id'; nodeId: string; name: string }
  | { type: 'selection_node_ids'; nodeIds: string[] }
  | { type: 'selection_error'; message: string }
  | { type: 'selection_screenshot'; ok: boolean; data?: string; mimeType?: string; error?: string }
  | { type: 'tool_response'; id: string; ok: boolean; content?: unknown[]; error?: { message: string } };

export function postToPlugin(msg: PluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function waitForPluginReply<T extends PluginReply['type']>(
  type: T,
  timeoutMs = 120_000
): Promise<Extract<PluginReply, { type: T }>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Plugin request timed out'));
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginReply | undefined;
      if (!msg || msg.type !== type) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(msg as Extract<PluginReply, { type: T }>);
    };
    window.addEventListener('message', handler);
  });
}

export async function exportSnapshot(
  hfcFileName: string,
  excludeNodeIds?: string[]
): Promise<unknown> {
  postToPlugin({ type: 'export_file', hfcFileName, excludeNodeIds });

  const chunks: { parts: string[]; total: number; name: string } = { parts: [], total: 0, name: hfcFileName };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Export timed out'));
    }, 300_000);

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginReply | undefined;
      if (!msg) return;

      if (msg.type === 'export_file_chunk') {
        if (!chunks.total) {
          chunks.total = msg.total;
          chunks.parts = new Array(msg.total);
          chunks.name = msg.hfcFileName;
        }
        chunks.parts[msg.index] = msg.data;
        return;
      }

      if (msg.type === 'export_file_result') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        if (!msg.ok) {
          reject(new Error(msg.error ?? 'Export failed'));
          return;
        }
        let json = msg.snapshotJson;
        if (!json && chunks.total) {
          if (chunks.parts.some((p) => p === undefined)) {
            reject(new Error('Incomplete snapshot chunks'));
            return;
          }
          json = chunks.parts.join('');
        }
        if (!json) {
          reject(new Error('No snapshot data'));
          return;
        }
        try {
          resolve(JSON.parse(json));
        } catch (e) {
          reject(e);
        }
      }
    };

    window.addEventListener('message', handler);
  });
}

async function waitForSelection<T extends PluginReply['type']>(
  successType: T,
  timeoutMs = 10_000
): Promise<Extract<PluginReply, { type: T }>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Selection request timed out'));
    }, timeoutMs);
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginReply | undefined;
      if (!msg) return;
      if (msg.type === 'selection_error') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        reject(new Error(msg.message));
        return;
      }
      if (msg.type !== successType) return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      resolve(msg as Extract<PluginReply, { type: T }>);
    };
    window.addEventListener('message', handler);
  });
}

export async function pickNodeId(): Promise<string> {
  postToPlugin({ type: 'get_selection_node_id' });
  const reply = await waitForSelection('selection_node_id');
  return reply.nodeId;
}

export async function pickExcludeNodeIds(): Promise<string[]> {
  postToPlugin({ type: 'get_selection_node_ids' });
  const reply = await waitForSelection('selection_node_ids');
  return reply.nodeIds;
}

export async function captureScreenshot(): Promise<string> {
  postToPlugin({ type: 'capture_selection_screenshot' });
  const reply = await waitForPluginReply('selection_screenshot', 30_000);
  if (!reply.ok || !reply.data) throw new Error(reply.error ?? 'Screenshot failed');
  return reply.data;
}
