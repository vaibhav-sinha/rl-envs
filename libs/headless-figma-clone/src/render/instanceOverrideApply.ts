/**
 * Apply per-layer instance override patches (formal `overrides` map on INSTANCE nodes).
 */
import type {
  ComponentOverrideFields,
  Effect,
  FrameNode,
  IndividualStrokeWeights,
  Paint,
  SceneNode,
} from '../model/types.js';
import { applyTriStateOverridePaints } from './instanceAppearance.js';

export function applyOverrideFieldsToNode(node: SceneNode, patch: ComponentOverrideFields): void {
  if (patch.visible !== undefined) node.visible = patch.visible;
  if (patch.opacity !== undefined) node.opacity = patch.opacity;
  if (patch.blendMode !== undefined) node.blendMode = patch.blendMode;
  if (patch.rotation !== undefined && 'rotation' in node) node.rotation = patch.rotation;

  applyTriStateOverridePaints(node as { fills?: Paint[]; strokes?: Paint[]; effects?: Effect[] }, patch, 'fills');
  if ('strokes' in node) {
    applyTriStateOverridePaints(node as { fills?: Paint[]; strokes?: Paint[]; effects?: Effect[] }, patch, 'strokes');
  }
  if ('effects' in node) {
    applyTriStateOverridePaints(node as { fills?: Paint[]; strokes?: Paint[]; effects?: Effect[] }, patch, 'effects');
  }

  if (node.type === 'TEXT') {
    const t = node;
    if (patch.characters !== undefined) t.characters = patch.characters;
    if (patch.fontSize !== undefined) t.fontSize = patch.fontSize;
    if (patch.fontWeight !== undefined) t.fontWeight = patch.fontWeight;
    if (patch.fontName !== undefined) t.fontName = { ...patch.fontName };
    if (patch.textAlignHorizontal !== undefined) t.textAlignHorizontal = patch.textAlignHorizontal;
    if (patch.textAlignVertical !== undefined) t.textAlignVertical = patch.textAlignVertical;
    if (patch.textAutoResize !== undefined) t.textAutoResize = patch.textAutoResize;
    if (patch.textTruncation !== undefined) t.textTruncation = patch.textTruncation;
    if (patch.maxLines !== undefined) t.maxLines = patch.maxLines;
    if (patch.lineHeight !== undefined) t.lineHeight = patch.lineHeight;
    if (patch.letterSpacing !== undefined) t.letterSpacing = patch.letterSpacing;
    if (patch.leadingTrim !== undefined) t.leadingTrim = patch.leadingTrim;
    if (patch.paragraphSpacing !== undefined) t.paragraphSpacing = patch.paragraphSpacing;
    if (patch.textCase !== undefined) t.textCase = patch.textCase;
    if (patch.textDecoration !== undefined) t.textDecoration = patch.textDecoration;
    if (patch.textStyleId !== undefined) t.textStyleId = patch.textStyleId;
    if (patch.styledSegments !== undefined) t.styledSegments = structuredClone(patch.styledSegments);
    return;
  }

  if (node.type === 'FRAME') {
    const f = node;
    if (patch.layoutMode !== undefined) f.layoutMode = patch.layoutMode;
    if (patch.paddingLeft !== undefined) f.paddingLeft = patch.paddingLeft;
    if (patch.paddingRight !== undefined) f.paddingRight = patch.paddingRight;
    if (patch.paddingTop !== undefined) f.paddingTop = patch.paddingTop;
    if (patch.paddingBottom !== undefined) f.paddingBottom = patch.paddingBottom;
    if (patch.itemSpacing !== undefined) f.itemSpacing = patch.itemSpacing;
    if (patch.primaryAxisAlignItems !== undefined) f.primaryAxisAlignItems = patch.primaryAxisAlignItems;
    if (patch.counterAxisAlignItems !== undefined) f.counterAxisAlignItems = patch.counterAxisAlignItems;
    if (patch.layoutSizingHorizontal !== undefined) f.layoutSizingHorizontal = patch.layoutSizingHorizontal;
    if (patch.layoutSizingVertical !== undefined) f.layoutSizingVertical = patch.layoutSizingVertical;
    if (patch.layoutAlign !== undefined) f.layoutAlign = patch.layoutAlign;
    if (patch.layoutGrow !== undefined) f.layoutGrow = patch.layoutGrow;
    if (patch.layoutPositioning !== undefined) f.layoutPositioning = patch.layoutPositioning;
    if (patch.clipsContent !== undefined) f.clipsContent = patch.clipsContent;
    if (patch.cornerRadius !== undefined) f.cornerRadius = patch.cornerRadius;
    if (patch.strokeWeight !== undefined) f.strokeWeight = patch.strokeWeight;
    if (patch.strokeAlign !== undefined) f.strokeAlign = patch.strokeAlign;
    if (patch.individualStrokeWeights !== undefined) {
      f.individualStrokeWeights = { ...patch.individualStrokeWeights };
    }
    if ('backgrounds' in patch && patch.backgrounds !== undefined) {
      f.backgrounds = patch.backgrounds.length > 0 ? structuredClone(patch.backgrounds) : [];
    }
    return;
  }

  if ('layoutSizingHorizontal' in node && patch.layoutSizingHorizontal !== undefined) {
    node.layoutSizingHorizontal = patch.layoutSizingHorizontal;
  }
  if ('layoutSizingVertical' in node && patch.layoutSizingVertical !== undefined) {
    node.layoutSizingVertical = patch.layoutSizingVertical;
  }
  if ('layoutAlign' in node && patch.layoutAlign !== undefined) {
    node.layoutAlign = patch.layoutAlign;
  }
  if ('layoutGrow' in node && patch.layoutGrow !== undefined) {
    node.layoutGrow = patch.layoutGrow;
  }
  if ('layoutPositioning' in node && patch.layoutPositioning !== undefined) {
    node.layoutPositioning = patch.layoutPositioning;
  }
  if ('strokeWeight' in node && patch.strokeWeight !== undefined) {
    (node as { strokeWeight?: number }).strokeWeight = patch.strokeWeight;
  }
  if ('individualStrokeWeights' in node && patch.individualStrokeWeights !== undefined) {
    (node as { individualStrokeWeights?: Partial<IndividualStrokeWeights> }).individualStrokeWeights = {
      ...patch.individualStrokeWeights,
    };
  }
  if ('cornerRadius' in node && patch.cornerRadius !== undefined) {
    (node as { cornerRadius?: number }).cornerRadius = patch.cornerRadius;
  }
}

export function applyComponentOverridesToTree(
  root: FrameNode,
  overrides: Record<string, ComponentOverrideFields> | undefined
): void {
  if (!overrides) return;
  const stack: SceneNode[] = [...root.children];
  while (stack.length) {
    const node = stack.pop()!;
    const o = overrides[node.id];
    if (o) applyOverrideFieldsToNode(node, o);
    if (node.type === 'FRAME' || node.type === 'TRANSFORM_GROUP' || node.type === 'GROUP') {
      for (const ch of node.children) stack.push(ch);
    } else if (node.type === 'BOOLEAN_OPERATION') {
      for (const ch of node.children as unknown as SceneNode[]) stack.push(ch);
    }
  }
}

/** Apply instance-shell overrides keyed by the INSTANCE id onto the cloned component root. */
export function applyInstanceShellOverrideToRoot(
  root: FrameNode,
  instanceId: string,
  overrides: Record<string, ComponentOverrideFields> | undefined
): void {
  const patch = overrides?.[instanceId];
  if (!patch) return;
  applyOverrideFieldsToNode(root, patch);
}
