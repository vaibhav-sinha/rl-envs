import type { DocumentEngine } from '../engine/DocumentEngine.js';
import { applyCreateNodeOp, type EngineOperation, type NewNodeSpec } from '../engine/DocumentEngine.js';
import type { BlendMode, Effect, FrameNode, PageNode, Paint, StyledSegment, VectorNode } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import type { FileEnvelope } from '../model/types.js';

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

interface ScriptContext {
  working: FileEnvelope;
  ops: EngineOperation[];
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
  protected _id: string | null = null;
  protected attached = false;
  protected ctx!: ScriptContext;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
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

  appendChild(
    child: RuntimeFrame | RuntimeText | RuntimeRectangle | RuntimeVector | RuntimeTransformGroup,
    index?: number
  ): void {
    if (!this.attached || this._id === null) {
      throw new Error('appendChild requires the frame to be appended to the page (or parent) first');
    }
    child.appendUnderParent(this._id, index, this.ctx);
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
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      type: 'FRAME',
      id: this._id,
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
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
    };
  }

  setRangeFontSize(start: number, end: number, fontSize: number): void {
    this.segments.push({ start, end, style: { fontSize } });
  }

  setRangeHyperlink(start: number, end: number, link: { type: 'URL'; url: string }): void {
    this.segments.push({ start, end, style: { hyperlink: link } });
  }
}

class RuntimeRectangle extends RuntimeSceneNode {
  readonly type = 'RECTANGLE' as const;
  name = 'Rectangle';
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  cornerRadius?: number;
  dashPattern?: number[];

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
      cornerRadius: this.cornerRadius,
      dashPattern: this.dashPattern,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
    };
  }
}

class RuntimeVector extends RuntimeSceneNode {
  readonly type = 'VECTOR' as const;
  name = 'Vector';
  vectorPaths: VectorNode['vectorPaths'] = [{ windingRule: 'NONZERO', data: 'M0,0 H40 V40 H0 Z' }];
  fills?: Paint[];

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
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
    };
  }
}

class RuntimeTransformGroup extends RuntimeSceneNode {
  readonly type = 'TRANSFORM_GROUP' as const;
  name = 'Group';

  appendChild(
    child: RuntimeFrame | RuntimeText | RuntimeRectangle | RuntimeVector | RuntimeTransformGroup,
    index?: number
  ): void {
    if (!this.attached || this._id === null) {
      throw new Error('appendChild requires the group to be appended to the page (or parent) first');
    }
    child.appendUnderParent(this._id, index, this.ctx);
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

  appendChild(
    child: RuntimeFrame | RuntimeText | RuntimeRectangle | RuntimeVector | RuntimeTransformGroup,
    index?: number
  ): void {
    child.appendUnderParent(this.pageId, index, this.ctx);
  }
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
  const ctx: ScriptContext = { working, ops: [] };
  const firstPage = working.document.children.find((c): c is PageNode => c.type === 'PAGE');
  if (!firstPage) {
    return { kind: 'error', errorCode: 'VALIDATION_ERROR', message: 'No PAGE in document' };
  }
  let currentPageId = firstPage.id;

  const figma = {
    root: {
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
    createFrame(): RuntimeFrame {
      return new RuntimeFrame().bindContext(ctx);
    },
    createText(): RuntimeText {
      return new RuntimeText().bindContext(ctx);
    },
    createTransformGroup(): RuntimeTransformGroup {
      return new RuntimeTransformGroup().bindContext(ctx);
    },
    createVector(): RuntimeVector {
      return new RuntimeVector().bindContext(ctx);
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
