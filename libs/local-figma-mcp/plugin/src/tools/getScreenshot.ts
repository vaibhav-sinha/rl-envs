import { normalizeNodeId } from '../utils.js';

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export async function runGetScreenshot(args: {
  nodeId: string;
  contentsOnly?: boolean;
  maxDimension?: number;
}): Promise<{ type: 'text'; text: string }[]> {
  const id = normalizeNodeId(args.nodeId);
  if (!id) throw new Error('VALIDATION_ERROR: nodeId is required');

  const node = await figma.getNodeByIdAsync(id);
  if (!node || !('exportAsync' in node)) {
    throw new Error(`UNKNOWN_NODE: Cannot export node ${id}`);
  }

  const exportable = node as ExportMixin & SceneNode;
  const box =
    'absoluteBoundingBox' in exportable && exportable.absoluteBoundingBox
      ? exportable.absoluteBoundingBox
      : { width: 100, height: 100 };

  const maxDim = args.maxDimension ?? 1024;
  const longer = Math.max(box.width, box.height, 1);
  const scale = Math.min(maxDim / longer, 4);

  const bytes = await exportable.exportAsync({
    format: 'PNG',
    constraint: { type: 'SCALE', value: scale },
    ...(args.contentsOnly ? { contentsOnly: true } : {}),
  });

  const renderedW = Math.round(box.width * scale);
  const renderedH = Math.round(box.height * scale);

  return [
    {
      type: 'text',
      text: JSON.stringify({
        requestId: id,
        width: renderedW,
        height: renderedH,
        original_width: Math.round(box.width),
        original_height: Math.round(box.height),
        _screenshotBase64: bytesToBase64(bytes),
        _screenshotMimeType: 'image/png',
      }),
    },
  ];
}
