import type { DocumentEngine } from '../engine/DocumentEngine.js';
import {
  applyCreateNodeOp,
  applyEngineOp,
  findEnvelopeNode,
  type EngineOperation,
  type NewNodeSpec,
} from '../engine/DocumentEngine.js';
import { ENGINE_MATRIX } from '../engine/phase-matrix.js';
import type {
  BlendMode,
  BooleanOperationNode,
  Effect,
  FileEnvelope,
  FrameNode,
  PageNode,
  Paint,
  StyledSegment,
  VectorNode,
} from '../model/types.js';
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
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  isMask?: boolean;
  protected _id: string | null = null;
  attached = false;
  protected ctx!: ScriptContext;

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
  }

  abstract toNewNodeSpec(): NewNodeSpec;
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
  layoutGrids?: FrameNode['layoutGrids'];

  appendChild(child: RuntimeSceneNode | { id: string }, index?: number): void {
    if (!this.attached || this._id === null) {
      throw new Error('appendChild requires the frame to be appended to the page (or parent) first');
    }
    appendChildToScriptParent(this.ctx, this._id, child, index);
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
      layoutGrids: this.layoutGrids,
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
      layoutAlign: this.layoutAlign,
      layoutGrow: this.layoutGrow,
      minWidth: this.minWidth,
      maxWidth: this.maxWidth,
      minHeight: this.minHeight,
      maxHeight: this.maxHeight,
      isMask: this.isMask,
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
    if (!this.attached || this._id === null) {
      throw new Error('appendChild requires the group to be appended to the page (or parent) first');
    }
    appendChildToScriptParent(this.ctx, this._id, child, index);
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
  readonly type = 'COMPONENT_INSTANCE' as const;
  name = 'Instance';
  mainComponentId = '';
  overrides?: Record<string, { fills?: Paint[]; characters?: string; fontSize?: number; fontWeight?: number }>;

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'COMPONENT_INSTANCE',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      mainComponentId: this.mainComponentId,
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
  const ctx: ScriptContext = { working, ops: [], deletedIds: new Set() };
  const firstPage = working.document.children.find((c): c is PageNode => c.type === 'PAGE');
  if (!firstPage) {
    return { kind: 'error', errorCode: 'VALIDATION_ERROR', message: 'No PAGE in document' };
  }
  let currentPageId = firstPage.id;

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
    createComponentInstance(mainComponentId: string): RuntimeComponentInstance {
      const n = new RuntimeComponentInstance().bindContext(ctx);
      n.mainComponentId = mainComponentId;
      return wrapRuntimeNode(n, ctx);
    },
    notify: (): void => {
      throw new Error('not implemented');
    },
    closePlugin: (): void => {
      throw new Error('figma.closePlugin is not supported in headless use_figma (handled by the host)');
    },
  };

  let rawResult: unknown;
  try {
    const fn = new AsyncFunction('figma', code);
    rawResult = await fn(figma);
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
