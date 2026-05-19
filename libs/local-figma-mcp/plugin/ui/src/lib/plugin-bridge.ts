import { TB_URL } from './constants';
import { fetchWithExportRetry } from './export-fetch-retry';
import {
  applyExportProgressUpdate,
  type ExportProgressPhase,
  type ExportProgressUpdate,
  type MultiPhaseExportProgress,
} from './export-progress-state';

export type { ExportProgressPhase, MultiPhaseExportProgress, ExportProgressUpdate };
export { applyExportProgressUpdate, createInitialExportProgress } from './export-progress-state';

export type PluginMessage =
  | { type: 'request_hello' }
  | {
      type: 'export_file';
      hfcFileName: string;
      exportId: string;
      excludeNodeIds?: string[];
    }
  | { type: 'get_selection_node_id' }
  | { type: 'get_selection_node_ids' }
  | { type: 'capture_selection_screenshot' }
  | { type: 'tool_request'; id: string; tool: string; args: Record<string, unknown> };

export type PluginReply =
  | { type: 'hello_data'; fileKey: string; fileName: string; pluginVersion: string }
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
  | { type: 'selection_screenshot'; ok: boolean; data?: string; mimeType?: string; error?: string }
  | { type: 'tool_response'; id: string; ok: boolean; content?: unknown[]; error?: { message: string } };

export function postToPlugin(msg: PluginMessage): void {
  parent.postMessage({ pluginMessage: msg }, '*');
}

function postStreamAck(seq: number): void {
  parent.postMessage({ pluginMessage: { type: 'export_stream_ack', seq } }, '*');
}

async function tbPostPart(exportId: string, line: string): Promise<{ seq: number }> {
  const res = await fetchWithExportRetry(`${TB_URL}/export/stream/${exportId}/part`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: line,
  });
  const body = (await res.json().catch(() => ({}))) as { seq?: number; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(body.error?.message ?? res.statusText);
  }
  return { seq: body.seq ?? 0 };
}

export interface StreamingExportOptions {
  excludeNodeIds?: string[];
  /** Receives a single phase update; merge with `applyExportProgressUpdate` in React state. */
  onProgress?: (update: ExportProgressUpdate) => void;
}

export interface StreamingExportResult {
  exportId: string;
}

export async function createExportStreamSession(): Promise<{ exportId: string }> {
  const res = await fetchWithExportRetry(`${TB_URL}/export/stream/session`, { method: 'POST' });
  const body = (await res.json().catch(() => ({}))) as {
    exportId?: string;
    error?: { message?: string };
  };
  if (!res.ok || !body.exportId) {
    throw new Error(body.error?.message ?? 'Failed to create export session');
  }
  return { exportId: body.exportId };
}

export async function finishExportStreamSession(
  exportId: string,
  options: {
    taskId?: string;
    mode?: 'full' | 'exclude';
    excludeNodeIds?: string[];
    standaloneFileName?: string;
  }
): Promise<{ saved?: boolean; filePath?: string; slug?: string }> {
  const res = await fetchWithExportRetry(`${TB_URL}/export/stream/${exportId}/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const body = (await res.json().catch(() => ({}))) as {
    saved?: boolean;
    filePath?: string;
    slug?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(body.error?.message ?? res.statusText);
  }
  return body;
}

/** Stream export from Figma plugin main thread → Task Builder (OOM-safe). */
export async function exportSnapshotStreaming(
  hfcFileName: string,
  options: StreamingExportOptions = {}
): Promise<StreamingExportResult> {
  const { exportId } = await createExportStreamSession();
  postToPlugin({ type: 'export_file', hfcFileName, exportId, excludeNodeIds: options.excludeNodeIds });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(
        new Error(
          'Export timed out after 2 hours (try again or export a smaller scope)'
        )
      );
    }, 7_200_000);

    const handler = async (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginReply | undefined;
      if (!msg) return;

      if (msg.type === 'export_progress') {
        options.onProgress?.({
          phase: msg.phase,
          current: msg.current,
          total: msg.total,
          percent: msg.percent,
          detail: msg.detail,
        });
        return;
      }

      if (msg.type === 'export_stream_part' && msg.exportId === exportId) {
        try {
          await tbPostPart(exportId, msg.line);
          postStreamAck(msg.seq);
        } catch (e) {
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          reject(e instanceof Error ? e : new Error(String(e)));
        }
        return;
      }

      if (msg.type === 'export_stream_done') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        if (!msg.ok) {
          reject(new Error(msg.error ?? 'Export failed'));
          return;
        }
        resolve({ exportId });
      }
    };

    window.addEventListener('message', handler);
  });
}

/** @deprecated Use exportSnapshotStreaming + finishExportStreamSession */
export async function exportSnapshot(
  hfcFileName: string,
  excludeNodeIds?: string[]
): Promise<unknown> {
  const { exportId } = await exportSnapshotStreaming(hfcFileName, { excludeNodeIds });
  await finishExportStreamSession(exportId, { standaloneFileName: hfcFileName });
  return { exportId };
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
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Screenshot timed out'));
    }, 30_000);
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginReply | undefined;
      if (!msg) return;
      if (msg.type === 'selection_screenshot') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        if (!msg.ok || !msg.data) reject(new Error(msg.error ?? 'Screenshot failed'));
        else resolve(msg.data);
      }
    };
    window.addEventListener('message', handler);
  });
}
