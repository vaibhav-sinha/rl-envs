import type { DocumentEngine } from '../engine/DocumentEngine.js';
import {
  ValidationErr,
  applyCreateNodeOp,
  type EngineOperation,
  type NewNodeSpec,
} from '../engine/DocumentEngine.js';
import type { FileEnvelope, FrameNode, PageNode } from '../model/types.js';

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

interface ScriptContext {
  working: FileEnvelope;
  ops: EngineOperation[];
}

class RuntimeFrame {
  readonly type = 'FRAME' as const;
  name = 'Frame';
  x = 0;
  y = 0;
  width = 100;
  height = 100;
  fills?: FrameNode['fills'];
  strokes?: FrameNode['strokes'];
  strokeWeight?: number;
  private _id: string | null = null;
  private attached = false;

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  get id(): string {
    if (this._id === null) {
      throw new Error(
        'Frame id is not available until the node has been appended with parent.appendChild(frame)'
      );
    }
    return this._id;
  }

  appendChild(child: RuntimeFrame, index?: number): void {
    if (!this.attached || this._id === null) {
      throw new Error('appendChild on a frame requires the frame to be appended to the page (or parent) first');
    }
    child.appendUnderParent(this._id, index, this.ctx);
  }

  private ctx!: ScriptContext;

  bindContext(ctx: ScriptContext): this {
    this.ctx = ctx;
    return this;
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

  toNewNodeSpec(): NewNodeSpec {
    return {
      type: 'FRAME',
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      children: [],
      fills: this.fills,
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
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

class RuntimePage {
  constructor(
    private readonly ctx: ScriptContext,
    readonly pageId: string
  ) {}

  get id(): string {
    return this.pageId;
  }

  appendChild(child: RuntimeFrame, index?: number): void {
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
    return { kind: 'error', errorCode: 'PHASE_LOCKED', message: 'No active file' };
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
