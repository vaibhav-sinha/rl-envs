import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getLocalFontsFileBaseUrl } from '../fonts/localFontRegistry.js';
import type { FileEnvelope } from '../model/types.js';
import { compileSubtreeForScreenshot } from '../render/compileForScreenshot.js';
import { buildImageDataUrlByHash } from '../render/imageDataUrls.js';
import { playwrightScreenshotService } from '../screenshot/PlaywrightScreenshotService.js';
import { addedIdsUnder, buildEditGraph } from './editGraph.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
const SCREENSHOT_TIMEOUT_MS = 30_000;

export async function renderNodeToFile(params: {
  envelope: FileEnvelope;
  envelopePath: string;
  nodeId: string;
  outPath: string;
  background?: 'white' | 'transparent';
  scale?: number;
}): Promise<void> {
  await mkdir(dirname(params.outPath), { recursive: true });

  const compiled = await compileSubtreeForScreenshot({
    envelope: params.envelope,
    rootNodeId: params.nodeId,
    options: {
      viewportPaddingPx: 0,
      includeCss: true,
      inlineCss: true,
      fontBaseUrl: getLocalFontsFileBaseUrl(),
      imageDataUrlByHash: buildImageDataUrlByHash(params.envelope, params.envelopePath),
    },
    screenshot: playwrightScreenshotService,
    screenshotTimeoutMs: SCREENSHOT_TIMEOUT_MS,
  });

  const shot = await playwrightScreenshotService.capture({
    compiled,
    clipRect: compiled.rootClip,
    format: 'png',
    scale: params.scale ?? 1,
    deviceScaleFactor: 2,
    background: params.background ?? 'white',
    timeoutMs: SCREENSHOT_TIMEOUT_MS,
  });

  await writeFile(params.outPath, shot.bytes);
}

export function bufferPHashSimilarity(a: Buffer, b: Buffer): number {
  const ha = createHash('sha256').update(a).digest('hex');
  const hb = createHash('sha256').update(b).digest('hex');
  return ha === hb ? 1 : 0;
}

/** Pick largest added node by width*height under region. */
export function resolveFocusNodeId(
  before: FileEnvelope,
  after: FileEnvelope,
  regionId: string,
  focus: 'largest_added' | 'added' | 'all'
): string {
  if (focus === 'all') return regionId;

  const graph = buildEditGraph(before, after);
  const added = addedIdsUnder(graph, regionId, after);
  if (added.length === 0) return regionId;

  if (focus === 'added') return added[0]!;

  let best = added[0]!;
  let bestArea = 0;
  for (const id of added) {
    const node = findEnvelopeNode(after, id);
    if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') continue;
    const area = ('width' in node ? node.width : 0) * ('height' in node ? node.height : 0);
    if (area > bestArea) {
      bestArea = area;
      best = id;
    }
  }
  return best;
}

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  parallel: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = idx++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]!();
    }
  }

  const workers = Array.from({ length: Math.min(parallel, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
