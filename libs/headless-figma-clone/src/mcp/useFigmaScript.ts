import type { DocumentEngine } from '../engine/DocumentEngine.js';
import {
  applyCreateNodeOp,
  applyEngineOp,
  findEnvelopeNode,
  registerAssetBytesInEnvelope,
  type EngineOperation,
  type NewNodeSpec,
} from '../engine/DocumentEngine.js';
import { queueFlattenNodes, queueGroupNodes, queueUngroup } from '../engine/graphOps.js';
import { hasMissingFont, listAvailableFonts, loadFontAsync } from '../fonts/fontCatalog.js';
import { createNodeSpecFromSvg } from '../images/svgImport.js';
import { fetchBytes, loadNetworkPolicyFromEnv } from '../images/networkPolicy.js';
import { findAllNodes, findOneNode, parseFindCriteria } from '../traversal/findNodes.js';
import { ENGINE_MATRIX } from '../engine/phase-matrix.js';
import type {
  BlendMode,
  BooleanOperationNode,
  Effect,
  ComponentPropertyValue,
  FileEnvelope,
  FontName,
  FrameNode,
  LayoutSizing,
  PageNode,
  Paint,
  StyledSegment,
  VectorNode,
} from '../model/types.js';
import { createStylesApi } from '../styles/StylesAPI.js';
import { bindVariableToNodeField, createVariablesApi } from '../variables/VariablesAPI.js';
import { ValidationErr } from '../util/errors.js';

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

function isPatchKeyForType(nodeType: string, key: string): boolean {
  const m = ENGINE_MATRIX.patchKeysByType as Record<string, Set<string> | undefined>;
  return Boolean(m[nodeType]?.has(key));
}

interface ScriptContext {
  working: FileEnvelope;
  ops: EngineOperation[];
  deletedIds: Set<string>;
  selectionByPageId: Map<string, string[]>;
}

function queueUpdate(ctx: ScriptContext, nodeId: string, patch: Record<string, unknown>): void {
  if (ctx.deletedIds.has(nodeId)) {
    throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);
  }
  const op: EngineOperation = { op: 'updateNode', nodeId, patch };
  ctx.ops.push(op);
  applyEngineOp(ctx.working, op);
}

function readChildId(child: RuntimeSceneNode | { id: string }): string {
  if (child instanceof RuntimeSceneNode) {
    const sid = child.getAttachedIdOrNull();
    if (!child.attached || sid === null) {
      throw new Error('appendChild: child must be attached to the document (or use a handle with .id)');
    }
    return sid;
  }
  if (typeof child.id === 'string') return child.id;
  throw new Error('appendChild: invalid child');
}

function appendChildToScriptParent(
  ctx: ScriptContext,
  parentId: string,
  child: RuntimeSceneNode | { id: string },
  index?: number
): void {
  if (child instanceof RuntimeSceneNode && !child.attached) {
    child.appendUnderParent(parentId, index, ctx);
    return;
  }
  const nodeId = readChildId(child);
  if (ctx.deletedIds.has(nodeId)) {
    throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);
  }
  const op: EngineOperation = { op: 'moveNode', nodeId, newParentId: parentId, index };
  ctx.ops.push(op);
  applyEngineOp(ctx.working, op);
}

function createHandleProxy(ctx: ScriptContext, id: string): unknown {
  return new Proxy(Object.freeze({ id }), {
    get(_t, prop) {
      if (prop === 'id') return id;
      if (prop === 'remove') {
        return (): void => {
          if (ctx.deletedIds.has(id)) {
            throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
          }
          const live = findEnvelopeNode(ctx.working, id);
          if (!live) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
          const op: EngineOperation = { op: 'deleteNode', nodeId: id };
          ctx.ops.push(op);
          applyEngineOp(ctx.working, op);
          ctx.deletedIds.add(id);
        };
      }
      if (prop === 'appendChild') {
        return (c: RuntimeSceneNode | { id: string }, idx?: number): void => {
          appendChildToScriptParent(ctx, id, c, idx);
        };
      }
      if (prop === 'insertChild') {
        return (idx: number, c: RuntimeSceneNode | { id: string }): void => {
          appendChildToScriptParent(ctx, id, c, idx);
        };
      }
      if (prop === 'setBoundVariable') {
        return (field: string, variable: { id: string } | null): void => {
          const patch = bindVariableToNodeField(
            ctx.working,
            id,
            field as Parameters<typeof bindVariableToNodeField>[2],
            variable
          );
          queueUpdate(ctx, id, patch);
        };
      }
      if (prop === 'mainComponent') {
        const live = findEnvelopeNode(ctx.working, id);
        if (!live || ctx.deletedIds.has(id) || (live.type !== 'INSTANCE' && live.type !== 'COMPONENT_INSTANCE')) return null;
        if (live.type === 'COMPONENT_INSTANCE') return createHandleProxy(ctx, live.mainComponentId);
        const inst = live as import('../model/types.js').InstanceNode;
        const main = findEnvelopeNode(ctx.working, inst.mainComponentId);
        if (!main) return null;
        if (main.type === 'COMPONENT') return createHandleProxy(ctx, main.id);
        if (main.type === 'COMPONENT_SET') {
          const set = main as import('../model/types.js').ComponentSetNode;
          const key = set.variantPropertyKey ?? 'variant';
          const selectedValue = inst.componentProperties?.[key]?.value ?? set.variantOptions?.[0];
          const options = set.variantOptions ?? set.componentIds;
          const idx = options.indexOf(String(selectedValue));
          const selectedComponentId = set.componentIds[idx] ?? set.componentIds[0];
          return createHandleProxy(ctx, selectedComponentId);
        }
        return null;
      }
      if (prop === 'variantProperties') {
        const live = findEnvelopeNode(ctx.working, id);
        if (!live || ctx.deletedIds.has(id) || live.type !== 'INSTANCE') return null;
        const inst = live as import('../model/types.js').InstanceNode;
        const main = findEnvelopeNode(ctx.working, inst.mainComponentId);
        if (!main || main.type !== 'COMPONENT_SET') return null;
        const set = main as import('../model/types.js').ComponentSetNode;
        const key = set.variantPropertyKey ?? 'variant';
        const value = inst.componentProperties?.[key]?.value ?? set.variantOptions?.[0] ?? null;
        return value === null ? null : { [key]: value };
      }
      if (prop === 'swapComponent') {
        return (componentNode: { id: string }): void => {
          const live = findEnvelopeNode(ctx.working, id);
          if (!live || ctx.deletedIds.has(id) || live.type !== 'INSTANCE') {
            throw new ValidationErr('UNSUPPORTED_OPERATION', 'swapComponent currently supports INSTANCE nodes');
          }
          const inst = live as import('../model/types.js').InstanceNode;
          const main = findEnvelopeNode(ctx.working, inst.mainComponentId);
          if (!main) throw new Error('swapComponent: missing main component');
          const componentId = componentNode.id;

          if (main.type === 'COMPONENT_SET') {
            const set = main as import('../model/types.js').ComponentSetNode;
            const idx = set.componentIds.indexOf(componentId);
            if (idx < 0) throw new Error('swapComponent: componentNode not in set');
            const key = set.variantPropertyKey ?? 'variant';
            const option =
              set.variantOptions?.[idx] ??
              (findEnvelopeNode(ctx.working, componentId) as any)?.name ??
              componentId;
            const nextProps = {
              ...(inst.componentProperties ?? {}),
              [key]: { type: 'VARIANT', value: String(option) },
            } as any;
            const op: EngineOperation = { op: 'updateNode', nodeId: id, patch: { componentProperties: nextProps } };
            ctx.ops.push(op);
            applyEngineOp(ctx.working, op);
            return;
          }

          if (main.type === 'COMPONENT') {
            const op: EngineOperation = {
              op: 'updateNode',
              nodeId: id,
              patch: { mainComponentId: componentId, componentProperties: undefined },
            };
            ctx.ops.push(op);
            applyEngineOp(ctx.working, op);
            return;
          }

          throw new Error('swapComponent: unsupported mainComponent type');
        };
      }
      if (prop === 'detachInstance') {
        return (): unknown[] => {
          if (ctx.deletedIds.has(id)) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
          const live = findEnvelopeNode(ctx.working, id);
          if (!live || (live.type !== 'INSTANCE' && live.type !== 'COMPONENT_INSTANCE')) return [];
          const op: EngineOperation = { op: 'deleteNode', nodeId: id };
          ctx.ops.push(op);
          applyEngineOp(ctx.working, op);
          ctx.deletedIds.add(id);
          return [];
        };
      }
      const live = findEnvelopeNode(ctx.working, id);
      if (!live || ctx.deletedIds.has(id)) return undefined;
      const v = (live as unknown as Record<string, unknown>)[prop as string];
      return typeof v === 'function' ? v : v;
    },
    set(_t, prop, value) {
      if (ctx.deletedIds.has(id)) {
        throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
      }
      const live = findEnvelopeNode(ctx.working, id);
      if (!live) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
      const p = prop as string;
      if (!isPatchKeyForType(live.type, p)) {
        throw new ValidationErr('UNSUPPORTED_PROPERTY', `Unsupported patch key: ${p}`);
      }
      queueUpdate(ctx, id, { [p]: value });
      return true;
    },
  });
}

function wrapRuntimeNode<N extends RuntimeSceneNode>(node: N, ctx: ScriptContext): N {
  return new Proxy(node, {
    set(target, prop, value, receiver) {
      const p = prop as string;
      if (
        target.attached &&
        target.getAttachedIdOrNull() !== null &&
        isPatchKeyForType(target.type, p)
      ) {
        queueUpdate(ctx, target.getAttachedIdOrNull()!, { [p]: value });
      }
      return Reflect.set(target, prop, value, receiver);
    },
  }) as N;
}

abstract class RuntimeSceneNode {
  abstract readonly type: string;
  name = 'Node';
  x = 0;
  y = 0;
  width = 100;
  height = 100;
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  effects?: Effect[];
  blendMode?: BlendMode;
  layoutAlign?: FrameNode['layoutAlign'];
  layoutGrow?: number;
  layoutSizingHorizontal?: LayoutSizing;
  layoutSizingVertical?: LayoutSizing;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  constraints?: FrameNode['constraints'];
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  isMask?: boolean;
  protected _id: string | null = null;
  attached = false;
  protected ctx!: ScriptContext;
  private pendingChildren: Array<{ child: RuntimeSceneNode | { id: string }; index?: number }> = [];

  protected appendChildInternal(child: RuntimeSceneNode | { id: string }, index?: number): void {
    if (!this.attached || this._id === null) {
      if (child instanceof RuntimeSceneNode && !child.attached) {
        this.pendingChildren.push({ child, index });
        return;
      }
      if (!(child instanceof RuntimeSceneNode) && typeof child.id === 'string') {
        this.pendingChildren.push({ child, index });
        return;
      }
      throw new Error('appendChild requires the parent to be appended to the document (or use a detached child)');
    }
    appendChildToScriptParent(this.ctx, this._id, child, index);
  }

  protected flushPendingChildren(): void {
    if (!this.attached || this._id === null) return;
    const pending = [...this.pendingChildren];
    this.pendingChildren = [];
    for (const { child, index } of pending) {
      appendChildToScriptParent(this.ctx, this._id, child, index);
    }
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, { width: w, height: h });
    }
  }

  bindContext(ctx: ScriptContext): this {
    this.ctx = ctx;
    return this;
  }

  get id(): string {
    if (this._id === null) {
      throw new Error(
        'Node id is not available until the node has been appended with parent.appendChild(node)'
      );
    }
    return this._id;
  }

  /** Used by script helpers outside subclasses (reparent / booleans). */
  getAttachedIdOrNull(): string | null {
    return this._id;
  }

  appendUnderParent(parentId: string, index: number | undefined, ctx: ScriptContext): void {
    if (this.attached) {
      throw new Error('Node is already attached to the document');
    }
    const node = this.toNewNodeSpec();
    const op: EngineOperation = { op: 'createNode', parentId, index, node };
    ctx.ops.push(op);
    try {
      this._id = applyCreateNodeOp(ctx.working, op);
    } catch (e) {
      ctx.ops.pop();
      throw e;
    }
    this.attached = true;
    this.flushPendingChildren();
  }

  setBoundVariable(field: string, variable: { id: string } | null): void {
    if (!this.attached || this._id === null) {
      throw new Error('setBoundVariable requires the node to be appended to the document');
    }
    if (this.type !== 'FRAME' && this.type !== 'TEXT') {
      throw new ValidationErr('VALIDATION_ERROR', `Node type ${this.type} does not support setBoundVariable`);
    }
    const patch = bindVariableToNodeField(
      this.ctx.working,
      this._id,
      field as Parameters<typeof bindVariableToNodeField>[2],
      variable
    );
    queueUpdate(this.ctx, this._id, patch);
  }

  abstract toNewNodeSpec(): NewNodeSpec;

  protected layoutSelfSpec(): Record<string, unknown> {
    return {
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
      layoutSizingHorizontal: this.layoutSizingHorizontal,
      layoutSizingVertical: this.layoutSizingVertical,
      layoutPositioning: this.layoutPositioning,
      constraints: this.constraints,
    };
  }
}

class RuntimeFrame extends RuntimeSceneNode {
  readonly type = 'FRAME' as const;
  name = 'Frame';
  fills?: FrameNode['fills'];
  strokes?: FrameNode['strokes'];
  strokeWeight?: number;
  strokeAlign?: FrameNode['strokeAlign'];
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  miterLimit?: number;
  dashPattern?: number[];
  backgrounds?: Paint[];
  clipsContent?: boolean;
  layoutMode?: FrameNode['layoutMode'];
  layoutWrap?: FrameNode['layoutWrap'];
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: FrameNode['primaryAxisAlignItems'];
  counterAxisAlignItems?: FrameNode['counterAxisAlignItems'];
  primaryAxisSizingMode?: LayoutSizing;
  counterAxisSizingMode?: LayoutSizing;
  layoutGrids?: FrameNode['layoutGrids'];

  appendChild(child: RuntimeSceneNode | { id: string }, index?: number): void {
    this.appendChildInternal(child, index);
  }

  insertChild(index: number, child: RuntimeSceneNode | { id: string }): void {
    this.appendChild(child, index);
  }

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'FRAME',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      fills: this.fills,
      backgrounds: this.backgrounds,
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
      strokeAlign: this.strokeAlign,
      strokeCap: this.strokeCap,
      strokeJoin: this.strokeJoin,
      miterLimit: this.miterLimit,
      dashPattern: this.dashPattern,
      effects: this.effects,
      clipsContent: this.clipsContent,
      layoutMode: this.layoutMode,
      layoutWrap: this.layoutWrap,
      itemSpacing: this.itemSpacing,
      paddingLeft: this.paddingLeft,
      paddingRight: this.paddingRight,
      paddingTop: this.paddingTop,
      paddingBottom: this.paddingBottom,
      primaryAxisAlignItems: this.primaryAxisAlignItems,
      counterAxisAlignItems: this.counterAxisAlignItems,
      primaryAxisSizingMode: this.primaryAxisSizingMode,
      counterAxisSizingMode: this.counterAxisSizingMode,
      layoutGrids: this.layoutGrids,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      layoutSizingHorizontal: this.layoutSizingHorizontal,
      layoutSizingVertical: this.layoutSizingVertical,
      layoutPositioning: this.layoutPositioning,
      constraints: this.constraints,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeText extends RuntimeSceneNode {
  readonly type = 'TEXT' as const;
  name = 'Text';
  width = 200;
  height = 32;
  characters = '';
  fontSize = 12;
  fontWeight = 400;
  fills?: FrameNode['fills'];
  textStyleId?: string;
  textOnPath?: { pathNodeId: string };
  private segments: StyledSegment[] = [];

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'TEXT',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      characters: this.characters,
      fontSize: this.fontSize,
      fontWeight: this.fontWeight,
      fills: this.fills,
      styledSegments: this.segments.length ? this.segments : undefined,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
      textStyleId: this.textStyleId,
      textOnPath: this.textOnPath,
    };
  }

  setRangeFontSize(start: number, end: number, fontSize: number): void {
    this.segments.push({ start, end, style: { fontSize } });
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, { styledSegments: [...this.segments] });
    }
  }

  setRangeHyperlink(start: number, end: number, link: { type: 'URL'; url: string }): void {
    this.segments.push({ start, end, style: { hyperlink: link } });
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, { styledSegments: [...this.segments] });
    }
  }
}

class RuntimeRectangle extends RuntimeSceneNode {
  readonly type = 'RECTANGLE' as const;
  name = 'Rectangle';
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: FrameNode['strokeAlign'];
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  miterLimit?: number;
  dashPattern?: number[];
  cornerRadius?: number;
  fillStyleId?: string;

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'RECTANGLE',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      fills: this.fills,
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
      strokeAlign: this.strokeAlign,
      strokeCap: this.strokeCap,
      strokeJoin: this.strokeJoin,
      miterLimit: this.miterLimit,
      dashPattern: this.dashPattern,
      cornerRadius: this.cornerRadius,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      ...this.layoutSelfSpec(),
      fillStyleId: this.fillStyleId,
    };
  }
}

class RuntimeEllipse extends RuntimeSceneNode {
  readonly type = 'ELLIPSE' as const;
  name = 'Ellipse';
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: FrameNode['strokeAlign'];
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  miterLimit?: number;
  dashPattern?: number[];
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number };

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'ELLIPSE',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      fills: this.fills,
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
      strokeAlign: this.strokeAlign,
      strokeCap: this.strokeCap,
      strokeJoin: this.strokeJoin,
      miterLimit: this.miterLimit,
      dashPattern: this.dashPattern,
      arcData: this.arcData,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeLine extends RuntimeSceneNode {
  readonly type = 'LINE' as const;
  name = 'Line';
  height = 0;
  strokes: Paint[] = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  strokeWeight = 1;
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  dashPattern?: number[];

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'LINE',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      strokes: this.strokes ?? [],
      strokeWeight: this.strokeWeight,
      strokeCap: this.strokeCap,
      strokeJoin: this.strokeJoin,
      dashPattern: this.dashPattern,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimePolygon extends RuntimeSceneNode {
  readonly type = 'POLYGON' as const;
  name = 'Polygon';
  pointCount = 6;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: FrameNode['strokeAlign'];
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  miterLimit?: number;
  dashPattern?: number[];

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'POLYGON',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      pointCount: this.pointCount,
      fills: this.fills,
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
      strokeAlign: this.strokeAlign,
      strokeCap: this.strokeCap,
      strokeJoin: this.strokeJoin,
      miterLimit: this.miterLimit,
      dashPattern: this.dashPattern,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeStar extends RuntimeSceneNode {
  readonly type = 'STAR' as const;
  name = 'Star';
  pointCount = 5;
  innerRadius = 0.5;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: FrameNode['strokeAlign'];
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  miterLimit?: number;
  dashPattern?: number[];

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'STAR',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      pointCount: this.pointCount,
      innerRadius: this.innerRadius,
      fills: this.fills,
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
      strokeAlign: this.strokeAlign,
      strokeCap: this.strokeCap,
      strokeJoin: this.strokeJoin,
      miterLimit: this.miterLimit,
      dashPattern: this.dashPattern,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeVector extends RuntimeSceneNode {
  readonly type = 'VECTOR' as const;
  name = 'Vector';
  vectorPaths: VectorNode['vectorPaths'] = [{ windingRule: 'NONZERO', data: 'M0,0 H40 V40 H0 Z' }];
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: FrameNode['strokeAlign'];
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  miterLimit?: number;
  dashPattern?: number[];

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'VECTOR',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      vectorPaths: this.vectorPaths,
      fills: this.fills,
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
      strokeAlign: this.strokeAlign,
      strokeCap: this.strokeCap,
      strokeJoin: this.strokeJoin,
      miterLimit: this.miterLimit,
      dashPattern: this.dashPattern,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeBooleanOperation extends RuntimeSceneNode {
  readonly type = 'BOOLEAN_OPERATION' as const;
  name = 'Boolean';
  booleanOperation: BooleanOperationNode['booleanOperation'] = 'UNION';
  fills?: Paint[];

  appendChild(child: RuntimeSceneNode | { id: string }, index?: number): void {
    if (!this.attached || this._id === null) {
      throw new Error('appendChild requires the boolean to be appended first');
    }
    appendChildToScriptParent(this.ctx, this._id, child, index);
  }

  insertChild(index: number, child: RuntimeSceneNode | { id: string }): void {
    this.appendChild(child, index);
  }

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'BOOLEAN_OPERATION',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      booleanOperation: this.booleanOperation,
      fills: this.fills,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeTransformGroup extends RuntimeSceneNode {
  readonly type = 'TRANSFORM_GROUP' as const;
  name = 'Group';

  appendChild(child: RuntimeSceneNode | { id: string }, index?: number): void {
    this.appendChildInternal(child, index);
  }

  insertChild(index: number, child: RuntimeSceneNode | { id: string }): void {
    this.appendChild(child, index);
  }

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'TRANSFORM_GROUP',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeTable extends RuntimeSceneNode {
  readonly type = 'TABLE' as const;
  name = 'Table';
  columnCount = 2;
  rowCount = 2;
  columnWidths: number[] = [80, 80];
  rowHeights: number[] = [28, 28];
  cells: Array<{ text: string; fills?: Paint[] }> = [
    { text: 'A' },
    { text: 'B' },
    { text: 'C' },
    { text: 'D' },
  ];

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'TABLE',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      columnCount: this.columnCount,
      rowCount: this.rowCount,
      columnWidths: [...this.columnWidths],
      rowHeights: [...this.rowHeights],
      cells: this.cells.map((c) => ({ text: c.text, fills: c.fills })),
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimeComponentInstance extends RuntimeSceneNode {
  readonly type = 'INSTANCE' as const;
  name = 'Instance';
  mainComponentId = '';
  componentProperties?: Record<string, ComponentPropertyValue>;
  overrides?: Record<string, { fills?: Paint[]; characters?: string; fontSize?: number; fontWeight?: number }>;

  private getCurrentComponentSet(): import('../model/types.js').ComponentSetNode | null {
    const main = findEnvelopeNode(this.ctx.working, this.mainComponentId);
    return main && main.type === 'COMPONENT_SET' ? (main as import('../model/types.js').ComponentSetNode) : null;
  }

  private getSelectedComponentIdFromSet(set: import('../model/types.js').ComponentSetNode): string {
    const key = set.variantPropertyKey ?? 'variant';
    const raw = this.componentProperties?.[key]?.value ?? set.variantOptions?.[0];
    const options = set.variantOptions ?? set.componentIds;
    const idx = options.indexOf(String(raw));
    return set.componentIds[idx] ?? set.componentIds[0];
  }

  get mainComponent(): unknown {
    const main = findEnvelopeNode(this.ctx.working, this.mainComponentId);
    if (!main) return null;
    if (main.type === 'COMPONENT') return createHandleProxy(this.ctx, main.id);
    if (main.type === 'COMPONENT_SET') {
      const selectedId = this.getSelectedComponentIdFromSet(main as import('../model/types.js').ComponentSetNode);
      return createHandleProxy(this.ctx, selectedId);
    }
    return null;
  }

  get variantProperties(): unknown | null {
    const set = this.getCurrentComponentSet();
    if (!set) return null;
    const key = set.variantPropertyKey ?? 'variant';
    const value = this.componentProperties?.[key]?.value ?? set.variantOptions?.[0] ?? null;
    if (value === null) return null;
    return { [key]: value };
  }

  swapComponent(componentNode: { id: string }): void {
    const componentId = componentNode.id;
    const main = findEnvelopeNode(this.ctx.working, this.mainComponentId);
    if (!main || (main.type !== 'COMPONENT_SET' && main.type !== 'COMPONENT')) {
      throw new Error(`swapComponent: unknown main component ${this.mainComponentId}`);
    }

    if (main.type === 'COMPONENT_SET') {
      const set = main as import('../model/types.js').ComponentSetNode;
      const idx = set.componentIds.indexOf(componentId);
      if (idx < 0) throw new Error('swapComponent: componentNode not in component set');
      const option = set.variantOptions?.[idx] ?? (findEnvelopeNode(this.ctx.working, componentId) as any)?.name ?? componentId;
      const key = set.variantPropertyKey ?? 'variant';
      const nextProps: Record<string, ComponentPropertyValue> = {
        ...(this.componentProperties ?? {}),
        [key]: { type: 'VARIANT', value: String(option) },
      };
      this.componentProperties = nextProps;
      const nid = this.getAttachedIdOrNull();
      if (nid !== null) queueUpdate(this.ctx, nid, { componentProperties: nextProps });
      return;
    }

    // Swapping directly between components (outside a set): update main component id and clear selection.
    this.mainComponentId = componentId;
    this.componentProperties = undefined;
    const nid = this.getAttachedIdOrNull();
    if (nid !== null) {
      queueUpdate(this.ctx, nid, { mainComponentId: componentId, componentProperties: undefined });
    }
  }

  detachInstance(): unknown[] {
    const nid = this.getAttachedIdOrNull();
    if (!nid) {
      // In Figma this would be illegal; we keep it simple.
      throw new Error('detachInstance requires an attached INSTANCE node');
    }
    const op: EngineOperation = { op: 'deleteNode', nodeId: nid };
    this.ctx.ops.push(op);
    applyEngineOp(this.ctx.working, op);
    this.ctx.deletedIds.add(nid);
    return [];
  }

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'INSTANCE',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      mainComponentId: this.mainComponentId,
      componentProperties: this.componentProperties,
      overrides: this.overrides,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
    };
  }
}

class RuntimePage {
  constructor(
    private readonly ctx: ScriptContext,
    readonly pageId: string
  ) {}

  get id(): string {
    return this.pageId;
  }

  findAll(criteria?: unknown): unknown[] {
    const p = findEnvelopeNode(this.ctx.working, this.pageId);
    if (!p || p.type !== 'PAGE') return [];
    return findAllNodes(p, parseFindCriteria(criteria)).map((n) => createHandleProxy(this.ctx, n.id));
  }

  findOne(criteria?: unknown): unknown | null {
    const p = findEnvelopeNode(this.ctx.working, this.pageId);
    if (!p || p.type !== 'PAGE') return null;
    const hit = findOneNode(p, parseFindCriteria(criteria));
    return hit ? createHandleProxy(this.ctx, hit.id) : null;
  }

  findAllWithCriteria(criteria: unknown): unknown[] {
    return this.findAll(criteria);
  }

  get selection(): unknown[] {
    const ids = this.ctx.selectionByPageId.get(this.pageId) ?? [];
    return ids
      .filter((id) => findEnvelopeNode(this.ctx.working, id) && !this.ctx.deletedIds.has(id))
      .map((id) => createHandleProxy(this.ctx, id));
  }

  set selection(nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>) {
    const ids = nodes.map((n) => (n instanceof RuntimeSceneNode ? n.getAttachedIdOrNull() ?? n.id : n.id));
    this.ctx.selectionByPageId.set(this.pageId, ids.filter(Boolean) as string[]);
  }

  appendChild(child: RuntimeSceneNode | { id: string }, index?: number): void {
    appendChildToScriptParent(this.ctx, this.pageId, child, index);
  }

  insertChild(index: number, child: RuntimeSceneNode | { id: string }): void {
    this.appendChild(child, index);
  }
}

const BOOLEAN_OPERAND_TYPES = new Set(['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'VECTOR']);

function readOperandId(n: RuntimeSceneNode | { id: string }): string {
  if (n instanceof RuntimeSceneNode) {
    const sid = n.getAttachedIdOrNull();
    if (!n.attached || sid === null) throw new Error('Boolean operands must be attached nodes');
    return sid;
  }
  return n.id;
}

function figmaBooleanCombine(
  ctx: ScriptContext,
  booleanOperation: BooleanOperationNode['booleanOperation'],
  nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
  parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
  index?: number
): unknown {
  if (nodes.length < 2) {
    throw new Error('At least two nodes are required for a boolean operation');
  }
  const parentId = 'pageId' in parent ? parent.pageId : parent.id;
  for (const n of nodes) {
    const id = readOperandId(n);
    const live = findEnvelopeNode(ctx.working, id);
    if (!live || ctx.deletedIds.has(id)) {
      throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
    }
    if (!BOOLEAN_OPERAND_TYPES.has(live.type)) {
      throw new ValidationErr('VALIDATION_ERROR', `Boolean operand must be RECTANGLE, ELLIPSE, POLYGON, STAR, or VECTOR (got ${live.type})`);
    }
  }
  const createOp: EngineOperation = {
    op: 'createNode',
    parentId,
    index,
    node: {
      type: 'BOOLEAN_OPERATION',
      name: 'Boolean',
      booleanOperation,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  };
  ctx.ops.push(createOp);
  const boolId = applyEngineOp(ctx.working, createOp)!;
  for (let i = 0; i < nodes.length; i++) {
    const nid = readOperandId(nodes[i]!);
    const mv: EngineOperation = { op: 'moveNode', nodeId: nid, newParentId: boolId, index: i };
    ctx.ops.push(mv);
    applyEngineOp(ctx.working, mv);
  }
  return createHandleProxy(ctx, boolId);
}

const AsyncFunction = Object.getPrototypeOf(async function () {
  /* noop */
}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;

export interface RunUseFigmaScriptOk {
  kind: 'ok';
  operations: EngineOperation[];
  /** JSON-serializable return value from the script (Figma serializes `return` for the agent). */
  result: unknown;
}

export interface RunUseFigmaScriptErr {
  kind: 'error';
  errorCode: string;
  message: string;
}

export async function runUseFigmaScript(
  code: string,
  engine: DocumentEngine
): Promise<RunUseFigmaScriptOk | RunUseFigmaScriptErr> {
  const file = engine.getActiveFile();
  if (!file) {
    return { kind: 'error', errorCode: 'NO_ACTIVE_FILE', message: 'No active file' };
  }

  const working = deepClone(file);
  const ctx: ScriptContext = {
    working,
    ops: [],
    deletedIds: new Set(),
    selectionByPageId: new Map(),
  };
  const firstPage = working.document.children.find((c): c is PageNode => c.type === 'PAGE');
  if (!firstPage) {
    return { kind: 'error', errorCode: 'VALIDATION_ERROR', message: 'No PAGE in document' };
  }
  let currentPageId = firstPage.id;
  ctx.selectionByPageId.set(currentPageId, []);
  const networkPolicy = loadNetworkPolicyFromEnv();
  const variablesApi = createVariablesApi(ctx);
  const stylesApi = createStylesApi(ctx);

  const figma = {
    root: {
      get id(): string {
        return ctx.working.document.id;
      },
      get children(): RuntimePage[] {
        return ctx.working.document.children
          .filter((c): c is PageNode => c.type === 'PAGE')
          .map((p) => new RuntimePage(ctx, p.id));
      },
    },
    get currentPage(): RuntimePage {
      const page = ctx.working.document.children.find(
        (c): c is PageNode => c.type === 'PAGE' && c.id === currentPageId
      );
      const id = page?.id ?? firstPage.id;
      return new RuntimePage(ctx, id);
    },
    setCurrentPageAsync: async (page: RuntimePage | { id: string }): Promise<void> => {
      const id = page instanceof RuntimePage ? page.pageId : page.id;
      const exists = ctx.working.document.children.some((c) => c.type === 'PAGE' && c.id === id);
      if (!exists) {
        throw new Error(`Unknown page id ${id}`);
      }
      currentPageId = id;
    },
    getNodeById(id: string): unknown {
      const n = findEnvelopeNode(ctx.working, id);
      if (!n || ctx.deletedIds.has(id)) return null;
      return createHandleProxy(ctx, id);
    },
    getNodeByIdAsync: async (id: string): Promise<unknown> => {
      return figma.getNodeById(id);
    },
    createPage(): RuntimePage {
      const idx = ctx.working.document.children.filter((c) => c.type === 'PAGE').length;
      const op: EngineOperation = {
        op: 'createNode',
        parentId: ctx.working.document.id,
        index: undefined,
        node: { type: 'PAGE', name: `Page ${String(idx + 1)}` },
      };
      ctx.ops.push(op);
      const pageId = applyEngineOp(ctx.working, op)!;
      return new RuntimePage(ctx, pageId);
    },
    createFrame(): RuntimeFrame {
      return wrapRuntimeNode(new RuntimeFrame().bindContext(ctx), ctx);
    },
    createText(): RuntimeText {
      return wrapRuntimeNode(new RuntimeText().bindContext(ctx), ctx);
    },
    createRectangle(): RuntimeRectangle {
      return wrapRuntimeNode(new RuntimeRectangle().bindContext(ctx), ctx);
    },
    createEllipse(): RuntimeEllipse {
      return wrapRuntimeNode(new RuntimeEllipse().bindContext(ctx), ctx);
    },
    createLine(): RuntimeLine {
      return wrapRuntimeNode(new RuntimeLine().bindContext(ctx), ctx);
    },
    createPolygon(): RuntimePolygon {
      return wrapRuntimeNode(new RuntimePolygon().bindContext(ctx), ctx);
    },
    createStar(): RuntimeStar {
      return wrapRuntimeNode(new RuntimeStar().bindContext(ctx), ctx);
    },
    createTransformGroup(): RuntimeTransformGroup {
      return wrapRuntimeNode(new RuntimeTransformGroup().bindContext(ctx), ctx);
    },
    createVector(): RuntimeVector {
      return wrapRuntimeNode(new RuntimeVector().bindContext(ctx), ctx);
    },
    createBooleanOperation(): RuntimeBooleanOperation {
      return wrapRuntimeNode(new RuntimeBooleanOperation().bindContext(ctx), ctx);
    },
    union: (
      nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown => figmaBooleanCombine(ctx, 'UNION', nodes, parent, index),
    subtract: (
      nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown => figmaBooleanCombine(ctx, 'SUBTRACT', nodes, parent, index),
    intersect: (
      nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown => figmaBooleanCombine(ctx, 'INTERSECT', nodes, parent, index),
    exclude: (
      nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown => figmaBooleanCombine(ctx, 'EXCLUDE', nodes, parent, index),
    createTable(rows?: number, cols?: number): RuntimeTable {
      const t = new RuntimeTable().bindContext(ctx);
      if (rows !== undefined && cols !== undefined) {
        if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
          throw new Error('createTable(rows, cols) requires positive integer rows and cols');
        }
        t.rowCount = rows;
        t.columnCount = cols;
        t.columnWidths = Array.from({ length: cols }, () => 80);
        t.rowHeights = Array.from({ length: rows }, () => 28);
        t.cells = Array.from({ length: rows * cols }, () => ({ text: '' }));
      }
      return wrapRuntimeNode(t, ctx);
    },
    createComponent(): unknown {
      // Component masters are represented as:
      // - a hidden FRAME (rootFrameId)
      // - a visible COMPONENT wrapper node that points at that FRAME.
      const rootOp: EngineOperation = {
        op: 'createNode',
        parentId: currentPageId,
        index: undefined,
        node: { type: 'FRAME', name: 'Component Root', x: 0, y: 0, width: 100, height: 100, visible: false },
      } as any;
      ctx.ops.push(rootOp);
      const rootFrameId = applyCreateNodeOp(ctx.working, rootOp as any);

      const compOp: EngineOperation = {
        op: 'createNode',
        parentId: currentPageId,
        index: undefined,
        node: { type: 'COMPONENT', name: 'Component', x: 0, y: 0, width: 100, height: 100, rootFrameId },
      } as any;
      ctx.ops.push(compOp);
      const compId = applyCreateNodeOp(ctx.working, compOp as any);
      return createHandleProxy(ctx, compId);
    },
    createComponentFromNode(node: RuntimeSceneNode | { id: string }): unknown {
      const nid = node instanceof RuntimeSceneNode ? node.getAttachedIdOrNull() ?? node.id : node.id;
      const live = findEnvelopeNode(ctx.working, nid);
      if (!live || live.type !== 'FRAME') {
        throw new Error('createComponentFromNode currently supports only FRAME nodes');
      }

      const frame = live as FrameNode;
      const compOp: EngineOperation = {
        op: 'createNode',
        parentId: currentPageId,
        index: undefined,
        node: {
          type: 'COMPONENT',
          name: frame.name,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
          rootFrameId: frame.id,
        },
      } as any;
      ctx.ops.push(compOp);
      const compId = applyCreateNodeOp(ctx.working, compOp as any);

      // Hide the original node; the component wrapper is the first-class representation.
      const hideOp: EngineOperation = { op: 'updateNode', nodeId: frame.id, patch: { visible: false } };
      ctx.ops.push(hideOp);
      applyEngineOp(ctx.working, hideOp);

      return createHandleProxy(ctx, compId);
    },
    combineAsVariants(
      nodes: ReadonlyArray<{ id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown {
      if (nodes.length < 1) throw new Error('combineAsVariants requires at least one component node');
      const parentId = 'pageId' in parent ? parent.pageId : parent.id;

      const componentIds = nodes.map((n) => n.id);
      const components = componentIds.map((cid) => {
        const c = findEnvelopeNode(ctx.working, cid);
        if (!c || c.type !== 'COMPONENT') throw new Error(`combineAsVariants: ${cid} is not a COMPONENT`);
        return c as import('../model/types.js').ComponentNode;
      });

      const base = components[0]!;
      const baseRoot = findEnvelopeNode(ctx.working, base.rootFrameId);
      if (!baseRoot || baseRoot.type !== 'FRAME') throw new Error('combineAsVariants: base.rootFrameId must be FRAME');

      function preorder(frame: FrameNode): Array<{ id: string; type: string; children?: string[] }> {
        const out: Array<{ id: string; type: string }> = [];
        const stack: Array<any> = [frame];
        while (stack.length) {
          const n = stack.pop()!;
          out.push({ id: n.id, type: n.type });
          if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
            for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
          } else if (n.type === 'BOOLEAN_OPERATION') {
            const ch = n.children as Array<any>;
            for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]!);
          }
        }
        return out;
      }

      const baseList = preorder(baseRoot as FrameNode);
      const nodeIdMapByComponentId: Record<string, Record<string, string>> = {};
      for (const comp of components) {
        const variantRoot = findEnvelopeNode(ctx.working, comp.rootFrameId);
        if (!variantRoot || variantRoot.type !== 'FRAME') throw new Error('combineAsVariants: variant root must be FRAME');
        const variantList = preorder(variantRoot as FrameNode);
        const map: Record<string, string> = {};
        const len = Math.min(baseList.length, variantList.length);
        for (let i = 0; i < len; i++) {
          if (baseList[i]!.type === variantList[i]!.type) {
            map[baseList[i]!.id] = variantList[i]!.id;
          }
        }
        nodeIdMapByComponentId[comp.id] = map;
      }

      const setOp: EngineOperation = {
        op: 'createNode',
        parentId,
        index,
        node: {
          type: 'COMPONENT_SET',
          name: 'Component Set',
          x: base.x,
          y: base.y,
          width: base.width,
          height: base.height,
          componentIds,
          variantPropertyKey: 'variant',
          variantOptions: components.map((c) => c.name),
          nodeIdMapByComponentId,
          baseComponentId: base.id,
        },
      } as any;
      ctx.ops.push(setOp);
      const setId = applyCreateNodeOp(ctx.working, setOp as any);
      return createHandleProxy(ctx, setId);
    },
    createComponentInstance(mainComponentId: string): RuntimeComponentInstance {
      const n = new RuntimeComponentInstance().bindContext(ctx);
      n.mainComponentId = mainComponentId;
      const main = findEnvelopeNode(ctx.working, mainComponentId);
      if (main && main.type === 'COMPONENT_SET') {
        const set = main as import('../model/types.js').ComponentSetNode;
        const key = set.variantPropertyKey ?? 'variant';
        const firstOption =
          set.variantOptions?.[0] ??
          (findEnvelopeNode(ctx.working, set.componentIds[0]) as any)?.name ??
          (set.componentIds[0] ?? '');
        n.componentProperties = { [key]: { type: 'VARIANT', value: String(firstOption) } };
      }
      return wrapRuntimeNode(n, ctx);
    },
    loadAllPagesAsync: async (): Promise<void> => {},
    listAvailableFontsAsync: async (): Promise<FontName[]> => listAvailableFonts(),
    loadFontAsync: async (fontName: FontName): Promise<void> => loadFontAsync(fontName),
    hasMissingFont: (): boolean => hasMissingFont(ctx.working),
    base64Encode: (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64'),
    base64Decode: (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'base64')),
    createImage: (bytes: Uint8Array): { hash: string } => {
      const { hash } = registerAssetBytesInEnvelope(ctx.working, Buffer.from(bytes), 'image/png');
      return { hash };
    },
    createImageAsync: async (src: string): Promise<{ hash: string }> => {
      const bytes = await fetchBytes(networkPolicy, src);
      const { hash } = registerAssetBytesInEnvelope(ctx.working, Buffer.from(bytes), 'image/png');
      return { hash };
    },
    getImageByHash: (hash: string): { hash: string; getBytesAsync: () => Promise<Uint8Array> } => {
      const rec = ctx.working.assets?.byId[hash];
      if (!rec) throw new Error(`Unknown image hash ${hash}`);
      return { hash: rec.sha256, getBytesAsync: async () => new Uint8Array(0) };
    },
    group: (
      nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown => {
      const parentId = 'pageId' in parent ? parent.pageId : parent.id;
      const ids = nodes.map((n) => readOperandId(n));
      const groupId = queueGroupNodes(ctx.working, ctx.ops, ids, { id: parentId }, index);
      return createHandleProxy(ctx, groupId);
    },
    ungroup: (node: { id: string }): unknown[] => {
      const moved = queueUngroup(ctx.working, ctx.ops, node.id);
      return moved.map((id) => createHandleProxy(ctx, id));
    },
    flatten: (
      nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown => {
      const parentId = 'pageId' in parent ? parent.pageId : parent.id;
      const ids = nodes.map((n) => readOperandId(n));
      const vecId = queueFlattenNodes(ctx.working, ctx.ops, ids, { id: parentId }, index);
      return createHandleProxy(ctx, vecId);
    },
    transformGroup: (
      nodes: ReadonlyArray<RuntimeSceneNode | { id: string }>,
      parent: RuntimePage | RuntimeFrame | RuntimeTransformGroup | { id: string },
      index?: number
    ): unknown => {
      const parentId = 'pageId' in parent ? parent.pageId : parent.id;
      const createOp = {
        op: 'createNode' as const,
        parentId,
        index,
        node: { type: 'TRANSFORM_GROUP' as const, name: 'Transform Group', x: 0, y: 0, width: 100, height: 100 },
      };
      ctx.ops.push(createOp);
      const tgId = applyCreateNodeOp(ctx.working, createOp);
      nodes.forEach((n, i) => {
        const nid = readOperandId(n);
        const mv: EngineOperation = { op: 'moveNode', nodeId: nid, newParentId: tgId, index: i };
        ctx.ops.push(mv);
        applyEngineOp(ctx.working, mv);
      });
      return createHandleProxy(ctx, tgId);
    },
    createAutoLayout: (): RuntimeFrame => {
      const f = new RuntimeFrame();
      f.layoutMode = 'HORIZONTAL';
      f.itemSpacing = 8;
      f.paddingLeft = 8;
      f.paddingRight = 8;
      f.paddingTop = 8;
      f.paddingBottom = 8;
      return wrapRuntimeNode(f.bindContext(ctx), ctx);
    },
    createSlice: (): unknown => {
      const op = {
        op: 'createNode' as const,
        parentId: currentPageId,
        node: { type: 'SLICE' as const, name: 'Slice', x: 0, y: 0, width: 100, height: 100 },
      };
      ctx.ops.push(op);
      return createHandleProxy(ctx, applyCreateNodeOp(ctx.working, op));
    },
    createSection: (): unknown => {
      const op = {
        op: 'createNode' as const,
        parentId: currentPageId,
        node: { type: 'SECTION' as const, name: 'Section', x: 0, y: 0, width: 400, height: 300 },
      };
      ctx.ops.push(op);
      return createHandleProxy(ctx, applyCreateNodeOp(ctx.working, op));
    },
    createNodeFromSvg: (svg: string): unknown => {
      const spec = createNodeSpecFromSvg(svg);
      const op = { op: 'createNode' as const, parentId: currentPageId, node: spec };
      ctx.ops.push(op);
      return createHandleProxy(ctx, applyCreateNodeOp(ctx.working, op));
    },
    createTextPath: (): unknown => {
      const op = {
        op: 'createNode' as const,
        parentId: currentPageId,
        node: {
          type: 'TEXT' as const,
          name: 'Text Path',
          characters: '',
          x: 0,
          y: 0,
          width: 200,
          height: 40,
        },
      };
      ctx.ops.push(op);
      return createHandleProxy(ctx, applyCreateNodeOp(ctx.working, op));
    },
    createPageDivider: (): RuntimePage => {
      const idx = ctx.working.document.children.filter((c) => c.type === 'PAGE').length;
      const op: EngineOperation = {
        op: 'createNode',
        parentId: ctx.working.document.id,
        node: { type: 'PAGE', name: `Divider ${String(idx + 1)}` },
      };
      ctx.ops.push(op);
      const pageId = applyCreateNodeOp(ctx.working, op);
      const up: EngineOperation = { op: 'updateNode', nodeId: pageId, patch: { isPageDivider: true } };
      ctx.ops.push(up);
      applyEngineOp(ctx.working, up);
      return new RuntimePage(ctx, pageId);
    },
    notify: (): void => {
      throw new Error('not implemented');
    },
    closePlugin: (): void => {
      throw new Error('figma.closePlugin is not supported in headless use_figma (handled by the host)');
    },
    variables: variablesApi,
    ...stylesApi,
  };

  let rawResult: unknown;
  try {
    const fn = new AsyncFunction('figma', 'fetch', code);
    const sandboxFetch = async (input: string): Promise<Response> => {
      const bytes = await fetchBytes(networkPolicy, input);
      return new Response(bytes, { status: 200 });
    };
    rawResult = await fn(figma, sandboxFetch);
  } catch (e) {
    if (e instanceof ValidationErr) {
      return { kind: 'error', errorCode: e.code, message: e.message };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { kind: 'error', errorCode: 'VALIDATION_ERROR', message: msg };
  }

  let result: unknown = rawResult;
  if (result !== undefined) {
    try {
      result = JSON.parse(JSON.stringify(result));
    } catch {
      result = String(rawResult);
    }
  } else {
    result = null;
  }

  return { kind: 'ok', operations: ctx.ops, result };
}
