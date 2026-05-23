import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { AnyTreeNode, FileEnvelope } from '../model/types.js';
import { getLocalFontsFileBaseUrl } from '../fonts/localFontRegistry.js';
import { buildImageDataUrlForSubtree } from '../render/imageDataUrls.js';
import { compileSubtreeForScreenshot } from '../render/compileForScreenshot.js';
import type { PlaywrightScreenshotService } from '../screenshot/PlaywrightScreenshotService.js';
import { ValidationErr } from '../util/errors.js';

export interface ScriptScreenshotRequest {
  nodeId: string;
  scale?: number;
  contentsOnly?: boolean;
}

export interface ScriptScreenshotResult {
  nodeId: string;
  caption: string;
  bytes: Buffer;
  mimeType: string;
}

export interface ScriptIoWrite {
  path: string;
  data: Uint8Array | string;
  mimeType: string;
}

const IO_MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  json: 'application/json',
  csv: 'text/csv',
};

export class SharedPluginDataStore {
  private readonly byNode = new Map<string, Map<string, Map<string, string>>>();

  get(nodeId: string, namespace: string, key: string): string {
    return this.byNode.get(nodeId)?.get(namespace)?.get(key) ?? '';
  }

  set(nodeId: string, namespace: string, key: string, value: string): void {
    let nsMap = this.byNode.get(nodeId);
    if (!nsMap) {
      nsMap = new Map();
      this.byNode.set(nodeId, nsMap);
    }
    let keyMap = nsMap.get(namespace);
    if (!keyMap) {
      keyMap = new Map();
      nsMap.set(namespace, keyMap);
    }
    keyMap.set(key, value);
  }

  keys(nodeId: string, namespace: string): string[] {
    const keyMap = this.byNode.get(nodeId)?.get(namespace);
    return keyMap ? [...keyMap.keys()] : [];
  }
}

export function queueIoWrite(writes: ScriptIoWrite[], path: string, data: Uint8Array | string): void {
  const normalized = path.trim().replace(/\\/g, '/');
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    throw new ValidationErr('VALIDATION_ERROR', 'figma.io.write: invalid path');
  }
  const base = normalized.split('/').pop() ?? normalized;
  const dot = base.lastIndexOf('.');
  if (dot < 1) {
    throw new ValidationErr('VALIDATION_ERROR', 'figma.io.write: path must include a file extension');
  }
  const ext = base.slice(dot + 1).toLowerCase();
  const mimeType = IO_MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `figma.io.write: unsupported extension .${ext} (use png, jpg, gif, webp, json, or csv)`
    );
  }
  writes.push({ path: normalized, data, mimeType });
}

/** Default 0.5x, capped so max output dimension ≤ 1024px unless scale is explicit. */
export function resolveScreenshotScale(width: number, height: number, explicitScale?: number): number {
  if (explicitScale !== undefined) return explicitScale;
  const maxDim = Math.max(width, height, 1);
  return Math.min(0.5, 1024 / maxDim);
}

function screenshotCaption(node: AnyTreeNode): string {
  const w = Math.round('width' in node ? Number(node.width) || 0 : 0);
  const h = Math.round('height' in node ? Number(node.height) || 0 : 0);
  const x = Math.round('x' in node ? Number(node.x) || 0 : 0);
  const y = Math.round('y' in node ? Number(node.y) || 0 : 0);
  const name = node.name?.replace(/[^\w\s./-]/g, '_') || node.type;
  return `${name} (${w}x${h} at ${x},${y}).png`;
}

export async function captureScriptScreenshots(params: {
  envelope: FileEnvelope;
  filePath: string | null;
  requests: ScriptScreenshotRequest[];
  placeholderNodeIds: ReadonlySet<string>;
  screenshot: PlaywrightScreenshotService;
  timeoutMs: number;
  defaultDeviceScaleFactor: number;
  defaultBackground: 'white' | 'transparent';
}): Promise<ScriptScreenshotResult[]> {
  const out: ScriptScreenshotResult[] = [];
  for (const req of params.requests) {
    const node = findEnvelopeNode(params.envelope, req.nodeId);
    if (!node) {
      throw new ValidationErr('UNKNOWN_NODE', `screenshot: unknown node ${req.nodeId}`);
    }
    const w = 'width' in node ? Number(node.width) || 1 : 1;
    const h = 'height' in node ? Number(node.height) || 1 : 1;
    const scale = resolveScreenshotScale(w, h, req.scale);
    const compiled = await compileSubtreeForScreenshot({
      envelope: params.envelope,
      rootNodeId: req.nodeId,
      options: {
        viewportPaddingPx: req.contentsOnly === false ? 8 : 0,
        includeCss: true,
        inlineCss: true,
        fontBaseUrl: getLocalFontsFileBaseUrl(),
        imageDataUrlByHash:
          params.filePath !== null
            ? buildImageDataUrlForSubtree(params.envelope, params.filePath, req.nodeId)
            : {},
        placeholderNodeIds: params.placeholderNodeIds,
      },
      screenshot: params.screenshot,
      screenshotTimeoutMs: params.timeoutMs,
    });
    const dpr = scale * params.defaultDeviceScaleFactor;
    const shot = await params.screenshot.capture({
      compiled,
      clipRect: compiled.rootClip,
      format: 'png',
      scale,
      deviceScaleFactor: dpr,
      background: params.defaultBackground,
      timeoutMs: params.timeoutMs,
    });
    out.push({
      nodeId: req.nodeId,
      caption: screenshotCaption(node),
      bytes: shot.bytes,
      mimeType: shot.mimeType,
    });
  }
  return out;
}

export const HFC_PLACEHOLDER_CSS = [
  '#hfc-root .hfc-placeholder{position:relative;overflow:hidden;}',
  '#hfc-root .hfc-placeholder::after{content:"";position:absolute;inset:0;pointer-events:none;',
  'background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.45) 50%,transparent 100%);',
  'background-size:200% 100%;animation:hfc-placeholder-shimmer 1.2s ease-in-out infinite;}',
  '@keyframes hfc-placeholder-shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}',
].join('');
