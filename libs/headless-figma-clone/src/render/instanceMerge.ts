/**
 * Merge detached instance subtrees onto cloned component masters.
 * Plugin exports store per-layer overrides in `instance.children`; this is the canonical path.
 */
import type {
  BlendMode,
  BooleanOperationNode,
  ComponentOverrideFields,
  Effect,
  EllipseNode,
  FrameNode,
  GroupNode,
  InstanceNode,
  LayoutSelfFields,
  LineNode,
  Paint,
  PolygonNode,
  RectangleNode,
  SceneNode,
  StarNode,
  TextNode,
  TransformGroupNode,
  VectorNode,
} from '../model/types.js';

type MergePaintField = 'fills' | 'strokes' | 'effects' | 'backgrounds';

export interface InstanceMergeContext {
  warnings: string[];
  /** Formal per-layer overrides map from the INSTANCE (tri-state paints). */
  overrides?: Record<string, ComponentOverrideFields>;
}

function hasExplicitPaintOverride(
  ctx: InstanceMergeContext,
  masterId: string | undefined,
  detachedId: string | undefined,
  field: MergePaintField
): boolean {
  const overrides = ctx.overrides;
  if (!overrides) return false;
  for (const nodeId of [detachedId, masterId]) {
    if (!nodeId) continue;
    const patch = overrides[nodeId];
    if (patch && Object.prototype.hasOwnProperty.call(patch, field)) return true;
  }
  return false;
}

type MergePaintsOptions = {
  /**
   * Nested INSTANCE shells export variant appearance as explicit paint arrays
   * (including `[]` for variants with no fill). Trust those clears during merge.
   */
  trustEmptyDetachedPaints?: boolean;
};

function shouldApplyDetachedPaintClear(
  ctx: InstanceMergeContext,
  masterId: string | undefined,
  detachedId: string | undefined,
  field: MergePaintField,
  paints: readonly unknown[] | undefined,
  options?: MergePaintsOptions
): boolean {
  if (paints === undefined) return false;
  if (paints.length > 0) return true;
  if (options?.trustEmptyDetachedPaints) return true;
  return hasExplicitPaintOverride(ctx, masterId, detachedId, field);
}

/** Strip instance prefix for pairing (`I2176:169422;24:6583` → `24:6583`). */
export function normalizeSourceFigmaId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const semi = id.lastIndexOf(';');
  if (semi >= 0) return id.slice(semi + 1);
  return id;
}

function mergeKey(node: SceneNode): string | undefined {
  return normalizeSourceFigmaId(node.sourceFigmaId);
}

function fallbackKey(node: SceneNode): string {
  return `${node.name}:${node.type}`;
}

export function copyLayoutSelfFields(target: LayoutSelfFields, source: LayoutSelfFields): void {
  if (source.layoutAlign !== undefined) target.layoutAlign = source.layoutAlign;
  if (source.layoutGrow !== undefined) target.layoutGrow = source.layoutGrow;
  if (source.minWidth !== undefined) target.minWidth = source.minWidth;
  if (source.maxWidth !== undefined) target.maxWidth = source.maxWidth;
  if (source.minHeight !== undefined) target.minHeight = source.minHeight;
  if (source.maxHeight !== undefined) target.maxHeight = source.maxHeight;
  if (source.isMask !== undefined) target.isMask = source.isMask;
  if (source.iconSvgAssetHash !== undefined) target.iconSvgAssetHash = source.iconSvgAssetHash;
  if (source.layoutSizingHorizontal !== undefined) target.layoutSizingHorizontal = source.layoutSizingHorizontal;
  if (source.layoutSizingVertical !== undefined) target.layoutSizingVertical = source.layoutSizingVertical;
  if (source.layoutPositioning !== undefined) target.layoutPositioning = source.layoutPositioning;
  if (source.constraints !== undefined) target.constraints = { ...source.constraints };
  if (source.gridRowSpan !== undefined) target.gridRowSpan = source.gridRowSpan;
  if (source.gridColumnSpan !== undefined) target.gridColumnSpan = source.gridColumnSpan;
  if (source.gridRowAnchorIndex !== undefined) target.gridRowAnchorIndex = source.gridRowAnchorIndex;
  if (source.gridColumnAnchorIndex !== undefined) target.gridColumnAnchorIndex = source.gridColumnAnchorIndex;
  if (source.gridChildHorizontalAlign !== undefined) target.gridChildHorizontalAlign = source.gridChildHorizontalAlign;
  if (source.gridChildVerticalAlign !== undefined) target.gridChildVerticalAlign = source.gridChildVerticalAlign;
}

type CornerRadiiFields = Pick<
  RectangleNode,
  'cornerRadius' | 'topLeftRadius' | 'topRightRadius' | 'bottomRightRadius' | 'bottomLeftRadius' | 'cornerSmoothing'
>;

function copyCornerRadiiFromDetached(master: CornerRadiiFields, detached: CornerRadiiFields): void {
  if (detached.cornerRadius !== undefined) master.cornerRadius = detached.cornerRadius;
  if (detached.topLeftRadius !== undefined) master.topLeftRadius = detached.topLeftRadius;
  if (detached.topRightRadius !== undefined) master.topRightRadius = detached.topRightRadius;
  if (detached.bottomRightRadius !== undefined) master.bottomRightRadius = detached.bottomRightRadius;
  if (detached.bottomLeftRadius !== undefined) master.bottomLeftRadius = detached.bottomLeftRadius;
  if (detached.cornerSmoothing !== undefined) master.cornerSmoothing = detached.cornerSmoothing;
}

export function copySceneBoundsFromDetached(master: SceneNode, detached: SceneNode): void {
  master.x = detached.x;
  master.y = detached.y;
  if (
    master.type === 'FRAME' ||
    master.type === 'RECTANGLE' ||
    master.type === 'ELLIPSE' ||
    master.type === 'LINE' ||
    master.type === 'POLYGON' ||
    master.type === 'STAR' ||
    master.type === 'VECTOR' ||
    master.type === 'TEXT' ||
    master.type === 'INSTANCE'
  ) {
    master.width = detached.width;
    master.height = detached.height;
  }
  if (detached.constraints) master.constraints = { ...detached.constraints };
}

function copySceneAppearance(
  master: { visible?: boolean; opacity?: number; blendMode?: BlendMode; rotation?: number },
  detached: { visible?: boolean; opacity?: number; blendMode?: BlendMode; rotation?: number }
): void {
  if (detached.visible !== undefined) master.visible = detached.visible;
  if (detached.opacity !== undefined) master.opacity = detached.opacity;
  if (detached.blendMode !== undefined) master.blendMode = detached.blendMode;
  if (detached.rotation !== undefined) master.rotation = detached.rotation;
}

function mergePaintsWithClear(
  master: {
    id?: string;
    fills?: Paint[];
    strokes?: Paint[];
    effects?: Effect[];
    fillStyleId?: string | null;
    strokeStyleId?: string | null;
    effectStyleId?: string | null;
  },
  detached: {
    id?: string;
    fills?: Paint[];
    strokes?: Paint[];
    effects?: Effect[];
    fillStyleId?: string | null;
    strokeStyleId?: string | null;
    effectStyleId?: string | null;
  },
  ctx: InstanceMergeContext,
  options?: MergePaintsOptions
): void {
  if (shouldApplyDetachedPaintClear(ctx, master.id, detached.id, 'fills', detached.fills, options)) {
    master.fills = detached.fills!.length > 0 ? structuredClone(detached.fills!) : [];
    if (detached.fills!.length === 0) delete master.fillStyleId;
  }
  if (shouldApplyDetachedPaintClear(ctx, master.id, detached.id, 'strokes', detached.strokes, options)) {
    master.strokes = detached.strokes!.length > 0 ? structuredClone(detached.strokes!) : [];
    if (detached.strokes!.length === 0) delete master.strokeStyleId;
  }
  if (shouldApplyDetachedPaintClear(ctx, master.id, detached.id, 'effects', detached.effects, options)) {
    master.effects = detached.effects!.length > 0 ? structuredClone(detached.effects!) : [];
    if (detached.effects!.length === 0) delete master.effectStyleId;
  }
  if (detached.fillStyleId !== undefined) {
    if (detached.fillStyleId === null) delete master.fillStyleId;
    else master.fillStyleId = detached.fillStyleId;
  }
  if (detached.strokeStyleId !== undefined) {
    if (detached.strokeStyleId === null) delete master.strokeStyleId;
    else master.strokeStyleId = detached.strokeStyleId;
  }
  if (detached.effectStyleId !== undefined) {
    if (detached.effectStyleId === null) delete master.effectStyleId;
    else master.effectStyleId = detached.effectStyleId;
  }
}

function copyStrokeExtras(
  master: {
    strokeWeight?: number;
    strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
    strokeCap?: RectangleNode['strokeCap'];
    strokeJoin?: RectangleNode['strokeJoin'];
    miterLimit?: number;
    dashPattern?: number[];
    individualStrokeWeights?: RectangleNode['individualStrokeWeights'];
  },
  detached: typeof master
): void {
  if (detached.strokeWeight !== undefined) master.strokeWeight = detached.strokeWeight;
  if (detached.strokeAlign !== undefined) master.strokeAlign = detached.strokeAlign;
  if (detached.strokeCap !== undefined) master.strokeCap = detached.strokeCap;
  if (detached.strokeJoin !== undefined) master.strokeJoin = detached.strokeJoin;
  if (detached.miterLimit !== undefined) master.miterLimit = detached.miterLimit;
  if (detached.dashPattern !== undefined) master.dashPattern = [...detached.dashPattern];
  if (detached.individualStrokeWeights !== undefined) {
    master.individualStrokeWeights = { ...detached.individualStrokeWeights };
  }
}

export function mergeRectangleFromDetached(
  master: RectangleNode,
  detached: RectangleNode,
  ctx: InstanceMergeContext = { warnings: [] }
): void {
  copySceneBoundsFromDetached(master, detached);
  copyCornerRadiiFromDetached(master, detached);
  copyLayoutSelfFields(master, detached);
  copySceneAppearance(master, detached);
  mergePaintsWithClear(master, detached, ctx);
  copyStrokeExtras(master, detached);
}

export function mergeTextFromDetached(
  master: TextNode,
  detached: TextNode,
  ctx: InstanceMergeContext = { warnings: [] }
): void {
  copySceneBoundsFromDetached(master, detached);
  copyLayoutSelfFields(master, detached);
  copySceneAppearance(master, detached);
  mergePaintsWithClear(master, detached, ctx);
  copyStrokeExtras(master, detached);

  if (detached.characters !== undefined) master.characters = detached.characters;
  if (detached.fontSize !== undefined) master.fontSize = detached.fontSize;
  if (detached.fontWeight !== undefined) master.fontWeight = detached.fontWeight;
  if (detached.fontName !== undefined) master.fontName = { ...detached.fontName };
  if (detached.textAlignHorizontal !== undefined) master.textAlignHorizontal = detached.textAlignHorizontal;
  if (detached.textAlignVertical !== undefined) master.textAlignVertical = detached.textAlignVertical;
  if (detached.textAutoResize !== undefined) master.textAutoResize = detached.textAutoResize;
  if (detached.textTruncation !== undefined) master.textTruncation = detached.textTruncation;
  if (detached.maxLines !== undefined) master.maxLines = detached.maxLines;
  if (detached.lineHeight !== undefined) master.lineHeight = detached.lineHeight;
  if (detached.letterSpacing !== undefined) master.letterSpacing = detached.letterSpacing;
  if (detached.leadingTrim !== undefined) master.leadingTrim = detached.leadingTrim;
  if (detached.paragraphIndent !== undefined) master.paragraphIndent = detached.paragraphIndent;
  if (detached.paragraphSpacing !== undefined) master.paragraphSpacing = detached.paragraphSpacing;
  if (detached.listSpacing !== undefined) master.listSpacing = detached.listSpacing;
  if (detached.textCase !== undefined) master.textCase = detached.textCase;
  if (detached.textDecoration !== undefined) master.textDecoration = detached.textDecoration;
  if (detached.hangingPunctuation !== undefined) master.hangingPunctuation = detached.hangingPunctuation;
  if (detached.hangingList !== undefined) master.hangingList = detached.hangingList;
  if (detached.listOptions !== undefined) master.listOptions = structuredClone(detached.listOptions);
  if (detached.textOnPath !== undefined) master.textOnPath = { ...detached.textOnPath };
  if (detached.styledSegments !== undefined) master.styledSegments = structuredClone(detached.styledSegments);
  if (detached.textStyleId !== undefined) master.textStyleId = detached.textStyleId;
  if (detached.explicitVariableModes !== undefined) {
    master.explicitVariableModes = structuredClone(detached.explicitVariableModes);
  }
  if (detached.boundVariables !== undefined) {
    master.boundVariables = detached.boundVariables
      ? structuredClone(detached.boundVariables)
      : undefined;
  }
}

function mergeFrameAutoLayout(master: FrameNode, detached: FrameNode): void {
  if (detached.layoutMode !== undefined) master.layoutMode = detached.layoutMode;
  if (detached.paddingLeft !== undefined) master.paddingLeft = detached.paddingLeft;
  if (detached.paddingRight !== undefined) master.paddingRight = detached.paddingRight;
  if (detached.paddingTop !== undefined) master.paddingTop = detached.paddingTop;
  if (detached.paddingBottom !== undefined) master.paddingBottom = detached.paddingBottom;
  if (detached.itemSpacing !== undefined) master.itemSpacing = detached.itemSpacing;
  if (detached.primaryAxisAlignItems !== undefined) master.primaryAxisAlignItems = detached.primaryAxisAlignItems;
  if (detached.counterAxisAlignItems !== undefined) master.counterAxisAlignItems = detached.counterAxisAlignItems;
  if (detached.layoutWrap !== undefined) master.layoutWrap = detached.layoutWrap;
  if (detached.counterAxisSpacing !== undefined) master.counterAxisSpacing = detached.counterAxisSpacing;
  if (detached.counterAxisAlignContent !== undefined) master.counterAxisAlignContent = detached.counterAxisAlignContent;
  if (detached.primaryAxisSizingMode !== undefined) master.primaryAxisSizingMode = detached.primaryAxisSizingMode;
  if (detached.counterAxisSizingMode !== undefined) master.counterAxisSizingMode = detached.counterAxisSizingMode;
  if (detached.itemReverseZIndex !== undefined) master.itemReverseZIndex = detached.itemReverseZIndex;
  if (detached.strokesIncludedInLayout !== undefined) master.strokesIncludedInLayout = detached.strokesIncludedInLayout;
}

export function mergeFrameFromDetached(master: FrameNode, detached: FrameNode, ctx: InstanceMergeContext): void {
  copySceneBoundsFromDetached(master, detached);
  copyCornerRadiiFromDetached(master, detached);
  copyLayoutSelfFields(master, detached);
  copySceneAppearance(master, detached);
  mergePaintsWithClear(master, detached, ctx);
  copyStrokeExtras(master, detached);
  if (detached.clipsContent !== undefined) master.clipsContent = detached.clipsContent;
  if (shouldApplyDetachedPaintClear(ctx, master.id, detached.id, 'backgrounds', detached.backgrounds)) {
    master.backgrounds =
      detached.backgrounds!.length > 0 ? structuredClone(detached.backgrounds!) : [];
  }
  if (detached.gridStyleId !== undefined) {
    if (detached.gridStyleId === null) delete master.gridStyleId;
    else master.gridStyleId = detached.gridStyleId;
  }
  if (detached.boundVariables !== undefined) {
    master.boundVariables = detached.boundVariables
      ? structuredClone(detached.boundVariables)
      : undefined;
  }
  if (detached.explicitVariableModes !== undefined) {
    master.explicitVariableModes = structuredClone(detached.explicitVariableModes);
  }
  mergeFrameAutoLayout(master, detached);
  mergeDetachedChildrenIntoRoot(master, detached.children, ctx);
}

function mergeShapeFromDetached(
  master: RectangleNode | EllipseNode | PolygonNode | StarNode | VectorNode | LineNode,
  detached: typeof master,
  ctx: InstanceMergeContext
): void {
  copySceneBoundsFromDetached(master, detached);
  copyLayoutSelfFields(master, detached);
  copySceneAppearance(master, detached);
  mergePaintsWithClear(master, detached, ctx);
  copyStrokeExtras(master, detached);
  if (master.type === 'VECTOR' && detached.type === 'VECTOR' && detached.vectorPaths !== undefined) {
    master.vectorPaths = structuredClone(detached.vectorPaths);
  }
  if (master.type === 'ELLIPSE' && detached.type === 'ELLIPSE' && detached.arcData !== undefined) {
    master.arcData = { ...detached.arcData };
  }
  if (master.type === 'POLYGON' && detached.type === 'POLYGON' && detached.pointCount !== undefined) {
    master.pointCount = detached.pointCount;
  }
  if (master.type === 'STAR' && detached.type === 'STAR') {
    if (detached.pointCount !== undefined) master.pointCount = detached.pointCount;
    if (detached.innerRadius !== undefined) master.innerRadius = detached.innerRadius;
  }
  if (master.type === 'LINE' && detached.type === 'LINE') {
    if (detached.strokeWeight !== undefined) master.strokeWeight = detached.strokeWeight;
  }
}

export function mergeInstanceFromDetached(
  master: InstanceNode,
  detached: InstanceNode,
  ctx: InstanceMergeContext = { warnings: [] }
): void {
  copySceneBoundsFromDetached(master, detached);
  copyLayoutSelfFields(master, detached);
  copySceneAppearance(master, detached);
  const instancePaintOptions: MergePaintsOptions = { trustEmptyDetachedPaints: true };
  mergePaintsWithClear(master, detached, ctx, instancePaintOptions);
  copyStrokeExtras(master, detached);
  copyCornerRadiiFromDetached(master, detached);
  if (detached.clipsContent !== undefined) master.clipsContent = detached.clipsContent;
  if (detached.mainComponentId !== undefined) master.mainComponentId = detached.mainComponentId;
  if (detached.componentProperties !== undefined) {
    master.componentProperties = structuredClone(detached.componentProperties);
  }
  if (detached.overrides !== undefined) master.overrides = structuredClone(detached.overrides);
  if (detached.children !== undefined) {
    master.children = structuredClone(detached.children);
  }
  if (
    shouldApplyDetachedPaintClear(
      ctx,
      master.id,
      detached.id,
      'backgrounds',
      detached.backgrounds,
      instancePaintOptions
    )
  ) {
    master.backgrounds =
      detached.backgrounds!.length > 0 ? structuredClone(detached.backgrounds!) : [];
  }
  if (detached.boundVariables !== undefined) {
    master.boundVariables = detached.boundVariables
      ? structuredClone(detached.boundVariables)
      : undefined;
  }
}

function mergeGroupLikeFromDetached(
  master: GroupNode | TransformGroupNode,
  detached: GroupNode | TransformGroupNode,
  ctx: InstanceMergeContext
): void {
  copySceneBoundsFromDetached(master, detached);
  copyLayoutSelfFields(master, detached);
  copySceneAppearance(master, detached);
  if (detached.type === 'TRANSFORM_GROUP' && master.type === 'TRANSFORM_GROUP' && detached.transformModifiers !== undefined) {
    master.transformModifiers = structuredClone(detached.transformModifiers);
  }
  mergeDetachedChildrenIntoRoot(master, detached.children, ctx);
}

function mergeBooleanFromDetached(master: BooleanOperationNode, detached: BooleanOperationNode, ctx: InstanceMergeContext): void {
  copySceneBoundsFromDetached(master, detached);
  copyLayoutSelfFields(master, detached);
  copySceneAppearance(master, detached);
  mergePaintsWithClear(master, detached, ctx);
  if (detached.booleanOperation !== undefined) master.booleanOperation = detached.booleanOperation;
  const n = Math.min(master.children.length, detached.children.length);
  for (let i = 0; i < n; i++) {
    mergeNodePairFromDetached(master.children[i]!, detached.children[i]! as SceneNode, ctx);
  }
}

/** Align exported instance subtrees onto cloned masters (same structure, instance-local ids and geometry). */
export function mergeNodePairFromDetached(master: SceneNode, detached: SceneNode, ctx: InstanceMergeContext): void {
  if (master.type === 'RECTANGLE' && detached.type === 'RECTANGLE') {
    mergeRectangleFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'TEXT' && detached.type === 'TEXT') {
    mergeTextFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'FRAME' && detached.type === 'FRAME') {
    mergeFrameFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'INSTANCE' && detached.type === 'INSTANCE') {
    mergeInstanceFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'VECTOR' && detached.type === 'VECTOR') {
    mergeShapeFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'ELLIPSE' && detached.type === 'ELLIPSE') {
    mergeShapeFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'LINE' && detached.type === 'LINE') {
    mergeShapeFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'POLYGON' && detached.type === 'POLYGON') {
    mergeShapeFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'STAR' && detached.type === 'STAR') {
    mergeShapeFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'GROUP' && detached.type === 'GROUP') {
    mergeGroupLikeFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'TRANSFORM_GROUP' && detached.type === 'TRANSFORM_GROUP') {
    mergeGroupLikeFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'BOOLEAN_OPERATION' && detached.type === 'BOOLEAN_OPERATION') {
    mergeBooleanFromDetached(master, detached, ctx);
    return;
  }
  if (master.type === 'FRAME' && master.children.length === 1) {
    mergeNodePairFromDetached(master.children[0]!, detached, ctx);
    return;
  }
  if (detached.type === 'FRAME' && detached.children.length === 1 && master.type !== 'FRAME') {
    mergeNodePairFromDetached(master, detached.children[0]!, ctx);
    return;
  }
  ctx.warnings.push(`instance_merge_type_mismatch:${master.type}:${detached.type}`);
}

type ChildrenContainer = { children: SceneNode[] };

export function mergeDetachedChildrenIntoRoot(
  root: ChildrenContainer,
  detached: SceneNode[],
  ctx: InstanceMergeContext
): void {
  if (!detached.length) return;
  const masterKids = root.children;
  if (
    masterKids.length === 1 &&
    masterKids[0]!.type === 'FRAME' &&
    detached.length === 1 &&
    detached[0]!.type !== 'FRAME'
  ) {
    mergeNodePairFromDetached(masterKids[0]!, detached[0]!, ctx);
    return;
  }
  if (detached.length === 1 && detached[0]!.type === 'FRAME') {
    const detachedFrame = detached[0] as FrameNode;
    const rootFrame = root as FrameNode;
    if ('type' in root && root.type === 'FRAME' && masterKids.length > 0) {
      const rootKey = mergeKey(rootFrame);
      const detachedKey = mergeKey(detachedFrame);
      if (rootKey && detachedKey && rootKey === detachedKey) {
        mergeFrameFromDetached(rootFrame, detachedFrame, ctx);
        return;
      }
      // Instance exports often wrap overrides in a frame whose id matches a direct child of the
      // component root (not the root itself), e.g. root 2413:168358 vs detached 2413:168359.
      if (detachedKey) {
        const matchingChild = masterKids.find((c) => mergeKey(c) === detachedKey);
        if (matchingChild) {
          mergeNodePairFromDetached(matchingChild, detachedFrame, ctx);
          return;
        }
      }
      mergeDetachedChildrenIntoRoot(root, detachedFrame.children, ctx);
      return;
    }
    if ('type' in root && root.type === 'FRAME' && masterKids.length === 0) {
      mergeFrameFromDetached(rootFrame, detachedFrame, ctx);
      return;
    }
  }

  const byFigmaId = new Map<string, SceneNode>();
  const byFallback = new Map<string, SceneNode>();
  for (const d of detached) {
    const fk = mergeKey(d);
    if (fk) {
      if (!byFigmaId.has(fk)) byFigmaId.set(fk, d);
    } else {
      byFallback.set(fallbackKey(d), d);
    }
  }

  for (const masterChild of masterKids) {
    const fk = mergeKey(masterChild);
    let detachedChild: SceneNode | undefined;
    if (fk) detachedChild = byFigmaId.get(fk);
    if (!detachedChild) detachedChild = byFallback.get(fallbackKey(masterChild));
    if (detachedChild) {
      mergeNodePairFromDetached(masterChild, detachedChild, ctx);
    } else {
      ctx.warnings.push(`instance_merge_unmatched_child:${masterChild.id}:${masterChild.name}`);
    }
  }
}
