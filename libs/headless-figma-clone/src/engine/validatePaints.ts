import type { AssetRegistry, DocumentNode, GradientPaint, Paint, PatternPaint, RGBA } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateRgb(c: { r: unknown; g: unknown; b: unknown }, label: string): void {
  for (const k of ['r', 'g', 'b'] as const) {
    const v = c[k];
    if (typeof v !== 'number' || v < 0 || v > 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.${k} must be number 0..1`);
    }
  }
}

function stopColor(c: unknown, label: string): RGBA {
  if (!isRecord(c)) throw new ValidationErr('VALIDATION_ERROR', `${label} invalid`);
  validateRgb(c as { r: unknown; g: unknown; b: unknown }, label);
  let a = 1;
  if (c.a !== undefined) {
    if (typeof c.a !== 'number' || c.a < 0 || c.a > 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.a must be number 0..1`);
    }
    a = c.a;
  }
  return { r: c.r as number, g: c.g as number, b: c.b as number, a };
}

function findAnyNode(root: DocumentNode, id: string): boolean {
  if (root.id === id) return true;
  for (const p of root.children) {
    if (p.id === id) return true;
    if (walkScene(p.children, id)) return true;
  }
  return false;
}

function walkScene(nodes: import('../model/types.js').SceneNode[], id: string): boolean {
  for (const n of nodes) {
    if (n.id === id) return true;
    if (n.type === 'FRAME' && walkScene(n.children, id)) return true;
  }
  return false;
}

function assertGradient(p: Record<string, unknown>, label: string): GradientPaint {
  const gt = p.gradientTransform;
  if (
    !Array.isArray(gt) ||
    gt.length !== 2 ||
    !Array.isArray(gt[0]) ||
    !Array.isArray(gt[1]) ||
    gt[0].length !== 3 ||
    gt[1].length !== 3
  ) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: gradientTransform must be 2×3 numeric matrix`);
  }
  const matrix: [[number, number, number], [number, number, number]] = [
    [Number(gt[0][0]), Number(gt[0][1]), Number(gt[0][2])],
    [Number(gt[1][0]), Number(gt[1][1]), Number(gt[1][2])],
  ];
  for (const row of matrix) {
    for (const v of row) {
      if (!Number.isFinite(v)) throw new ValidationErr('VALIDATION_ERROR', `${label}: gradientTransform must be finite`);
    }
  }
  const stopsRaw = p.gradientStops;
  if (!Array.isArray(stopsRaw) || stopsRaw.length < 2) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: gradientStops must have at least 2 stops`);
  }
  const gradientStops: GradientPaint['gradientStops'] = [];
  for (let i = 0; i < stopsRaw.length; i++) {
    const s = stopsRaw[i];
    if (!isRecord(s) || typeof s.position !== 'number') {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.gradientStops[${String(i)}] invalid`);
    }
    if (s.position < 0 || s.position > 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.gradientStops[${String(i)}].position must be 0..1`);
    }
    const rgba = stopColor(s.color, `${label}.gradientStops[${String(i)}].color`);
    gradientStops.push({ position: s.position, color: rgba });
  }
  const t = p.type;
  if (t !== 'GRADIENT_LINEAR' && t !== 'GRADIENT_RADIAL') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: only GRADIENT_LINEAR and GRADIENT_RADIAL supported`);
  }
  return {
    type: t,
    gradientTransform: matrix,
    gradientStops,
    visible: p.visible as boolean | undefined,
    opacity: p.opacity as number | undefined,
    blendMode: p.blendMode as GradientPaint['blendMode'],
  };
}

function assertImage(
  p: Record<string, unknown>,
  label: string,
  assets: AssetRegistry | undefined
): import('../model/types.js').ImagePaint {
  const imageHash = p.imageHash;
  if (typeof imageHash !== 'string' || imageHash.length < 8) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: imageHash must be a non-trivial string`);
  }
  const reg = assets?.byId ?? {};
  const hit =
    reg[imageHash] ??
    Object.values(reg).find((r) => r.sha256 === imageHash || r.id === imageHash);
  if (!hit) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: unknown imageHash (upload asset first)`);
  }
  const sm = p.scaleMode;
  if (sm !== 'FILL' && sm !== 'FIT' && sm !== 'TILE' && sm !== 'STRETCH') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: scaleMode must be FILL|FIT|TILE|STRETCH`);
  }
  return {
    type: 'IMAGE',
    imageHash: hit.sha256,
    scaleMode: sm,
    visible: p.visible as boolean | undefined,
    opacity: p.opacity as number | undefined,
    blendMode: p.blendMode as import('../model/types.js').ImagePaint['blendMode'],
  };
}

function assertPattern(
  p: Record<string, unknown>,
  label: string,
  document: DocumentNode
): PatternPaint {
  const sourceNodeId = p.sourceNodeId;
  if (typeof sourceNodeId !== 'string' || !/^I[0-9]+$/.test(sourceNodeId)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: sourceNodeId must be a node id`);
  }
  if (!findAnyNode(document, sourceNodeId)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: pattern sourceNodeId not found`);
  }
  const tileType = p.tileType;
  if (tileType !== 'RECTANGULAR') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: only RECTANGULAR tileType supported`);
  }
  const scalingFactor = p.scalingFactor;
  if (typeof scalingFactor !== 'number' || !Number.isFinite(scalingFactor) || scalingFactor <= 0) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: scalingFactor must be a positive finite number`);
  }
  return {
    type: 'PATTERN',
    sourceNodeId,
    tileType: 'RECTANGULAR',
    scalingFactor,
    visible: p.visible as boolean | undefined,
    opacity: p.opacity as number | undefined,
    blendMode: p.blendMode as PatternPaint['blendMode'],
  };
}

export function assertPaint(
  p: unknown,
  label: string,
  assets: AssetRegistry | undefined,
  document: DocumentNode
): Paint {
  if (!isRecord(p) || typeof p.type !== 'string') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid paint`);
  }
  if (p.type === 'SOLID') {
    if (!isRecord(p.color)) throw new ValidationErr('VALIDATION_ERROR', `${label}: missing color`);
    validateRgb(p.color as { r: unknown; g: unknown; b: unknown }, `${label}.color`);
    const out: import('../model/types.js').SolidPaint = {
      type: 'SOLID',
      color: { r: p.color.r as number, g: p.color.g as number, b: p.color.b as number },
      visible: p.visible as boolean | undefined,
      opacity: p.opacity as number | undefined,
      blendMode: p.blendMode as import('../model/types.js').SolidPaint['blendMode'],
    };
    return out;
  }
  if (p.type === 'GRADIENT_LINEAR' || p.type === 'GRADIENT_RADIAL') {
    return assertGradient(p, label);
  }
  if (p.type === 'IMAGE') {
    return assertImage(p, label, assets);
  }
  if (p.type === 'PATTERN') {
    return assertPattern(p, label, document);
  }
  throw new ValidationErr('VALIDATION_ERROR', `${label}: unsupported paint type ${p.type}`);
}

export function validatePaintArray(
  arr: unknown,
  label: string,
  assets: AssetRegistry | undefined,
  document: DocumentNode
): Paint[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw new ValidationErr('VALIDATION_ERROR', `${label}: must be array`);
  return arr.map((x, i) => assertPaint(x, `${label}[${String(i)}]`, assets, document));
}
