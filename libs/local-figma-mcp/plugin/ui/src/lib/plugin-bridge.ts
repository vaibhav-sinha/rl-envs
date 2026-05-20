import { TB_URL } from './constants';
import { EXPORT_UI_ASSET_UPLOAD_CONCURRENCY } from '../../../src/streamProtocol.js';

function formatExportError(error: unknown, fallback = 'Export failed'): string {
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg) return msg;
    if (error.name && error.name !== 'Error' && error.name !== 'undefined') {
      return `${error.name} (no message)`;
    }
  }
  if (typeof error === 'string') {
    const msg = error.trim();
    if (msg) return msg;
  }
  if (error !== undefined && error !== null && !(error instanceof Error)) {
    const msg = String(error).trim();
    if (msg && msg !== '[object Object]') return msg;
  }
  return fallback;
}

async function readTbErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text.trim()) {
    return res.statusText.trim() || `HTTP ${res.status}`;
  }
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) return msg;
  } catch {
    /* not JSON */
  }
  return text.trim().slice(0, 500) || `HTTP ${res.status}`;
}
import { fetchWithExportRetry } from './export-fetch-retry';
import {
  isImagePartUploadFallbackError,
  substituteBlankRasterImageLine,
} from './export-stream-part-fallback';
import { UiUploadMetrics } from './export-metrics';
import {
  applyExportProgressSnapshot,
  applyFinalizeProgress,
  type ExportProgressSnapshot,
  type MultiPhaseExportProgress,
} from './export-progress-state';
import { HybridUploadQueue, isAssetUploadBody } from './hybrid-upload-queue';

export type { MultiPhaseExportProgress, ExportProgressSnapshot };
export {
  applyExportProgressSnapshot,
  applyFinalizeProgress,
  createInitialExportProgress,
} from './export-progress-state';

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
  | { type: 'tool_request'; id: string; tool: string; args: Record<string, unknown> }
  | { type: 'export_stream_upload_failed'; exportId: string; seq: number; error: string };

export type PluginReply =
  | { type: 'hello_data'; fileKey: string; fileName: string; pluginVersion: string }
  | { type: 'log'; line: string }
  | { type: 'export_progress_v2'; snapshot: ExportProgressSnapshot }
  | { type: 'export_stream_part'; exportId: string; seq: number; line: string }
  | { type: 'export_stream_batch'; exportId: string; seq: number; lines: string[] }
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

async function tbPostPartBodyOnce(exportId: string, body: string): Promise<{ seq: number }> {
  const res = await fetchWithExportRetry(`${TB_URL}/export/stream/${exportId}/part`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body,
  });
  if (!res.ok) {
    const message = await readTbErrorMessage(res);
    console.error('[export] Task Builder part upload failed:', res.status, message);
    throw new Error(message);
  }
  const parsed = (await res.json().catch(() => ({}))) as { seq?: number };
  return { seq: parsed.seq ?? 0 };
}

async function tbPostPartBody(exportId: string, body: string): Promise<{ seq: number }> {
  try {
    return await tbPostPartBodyOnce(exportId, body);
  } catch (error) {
    const fallbackLine = substituteBlankRasterImageLine(body);
    if (!fallbackLine || !isImagePartUploadFallbackError(error)) {
      throw error;
    }
    console.warn(
      '[export] Raster image part upload failed; sending blank PNG placeholder instead.',
      error
    );
    return await tbPostPartBodyOnce(exportId, fallbackLine);
  }
}

export interface StreamingExportOptions {
  excludeNodeIds?: string[];
  /** Latest progress snapshot from the plugin main thread (merge with applyExportProgressSnapshot). */
  onProgress?: (snapshot: ExportProgressSnapshot) => void;
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
    throw new Error(body.error?.message?.trim() || res.statusText.trim() || `HTTP ${res.status}`);
  }
  return body;
}

function mergeSnapshotWithUiMetrics(
  snapshot: ExportProgressSnapshot,
  uiUploadMetrics: UiUploadMetrics
): ExportProgressSnapshot {
  const timing = uiUploadMetrics.mergeIntoTiming(snapshot.timing);
  return {
    ...snapshot,
    timing,
    tracks: {
      ...snapshot.tracks,
      upload: {
        ...snapshot.tracks.upload,
        httpPartsUploaded: uiUploadMetrics.partsUploaded,
      },
    },
  };
}

/** Stream export from Figma plugin main thread → Task Builder (OOM-safe). */
export async function exportSnapshotStreaming(
  hfcFileName: string,
  options: StreamingExportOptions = {}
): Promise<StreamingExportResult> {
  const { exportId } = await createExportStreamSession();
  postToPlugin({ type: 'export_file', hfcFileName, exportId, excludeNodeIds: options.excludeNodeIds });

  const uploadQueue = new HybridUploadQueue(EXPORT_UI_ASSET_UPLOAD_CONCURRENCY);
  const uiUploadMetrics = new UiUploadMetrics();

  const uploadPart = async (body: string, seq: number): Promise<void> => {
    const started = Date.now();
    try {
      await tbPostPartBody(exportId, body);
    } finally {
      uiUploadMetrics.recordUpload(Date.now() - started);
    }
    postStreamAck(seq);
  };

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(
        new Error(
          'Export timed out after 20 hours (try again or export a smaller scope)'
        )
      );
    }, 72_000_000);

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginReply | undefined;
      if (!msg) return;

      if (msg.type === 'export_progress_v2') {
        const merged = mergeSnapshotWithUiMetrics(msg.snapshot, uiUploadMetrics);
        options.onProgress?.(merged);
        return;
      }

      const failUpload = (seq: number, error: unknown): void => {
        const message = formatExportError(error);
        parent.postMessage(
          {
            pluginMessage: {
              type: 'export_stream_upload_failed',
              exportId,
              seq,
              error: message,
            },
          },
          '*'
        );
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        reject(new Error(message));
      };

      if (msg.type === 'export_stream_part' && msg.exportId === exportId) {
        const body = msg.line;
        const job = () => uploadPart(body, msg.seq);
        const enqueue = isAssetUploadBody(body)
          ? () => uploadQueue.enqueueAsset(job)
          : () => uploadQueue.enqueueBatch(job);
        void enqueue().catch((e) => failUpload(msg.seq, e));
        return;
      }

      if (msg.type === 'export_stream_batch' && msg.exportId === exportId) {
        const body = msg.lines.join('');
        void uploadQueue
          .enqueueBatch(() => uploadPart(body, msg.seq))
          .catch((e) => failUpload(msg.seq, e));
        return;
      }

      if (msg.type === 'export_stream_done') {
        void uploadQueue.whenIdle().then(() => {
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          if (!msg.ok) {
            reject(new Error(formatExportError(msg.error, 'Export failed in plugin')));
            return;
          }
          resolve({ exportId });
        });
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
