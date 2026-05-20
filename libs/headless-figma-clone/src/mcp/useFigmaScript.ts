import type { DocumentEngine } from '../engine/DocumentEngine.js';
import {
  applyCreateNodeOp,
  applyEngineOp,
  findComponentIdByKey,
  findEnvelopeNode,
  findParentNode,
  registerAssetBytesInEnvelope,
  validateTransformModifiers,
  type EngineOperation,
  type NewNodeSpec,
} from '../engine/DocumentEngine.js';
import { applyEnvelopeOperation } from '../engine/envelopeOps.js';
import { boundsOfNodes, queueFlattenNodes, queueGroupNodes, queueUngroup } from '../engine/graphOps.js';
import { computeFillGeometry, computeStrokeGeometry, outlineStrokeToVector } from '../render/geometry.js';
import { normalizePathDataToOrigin } from '../render/vectorPathBounds.js';
import { hasMissingFont, listAvailableFonts, loadFontAsync } from '../fonts/fontCatalog.js';
import { createNodeSpecFromSvg } from '../images/svgImport.js';
import { fetchBytes, loadNetworkPolicyFromEnv } from '../images/networkPolicy.js';
import { getImmediateSceneChildren } from '../traversal/findNodes.js';
import { createTraversalMethods } from './scriptTraversal.js';
import { HFC_HANDLE_FLAG, HFC_HANDLE_MARKER, snapshotForReturn } from './scriptNodeSnapshot.js';
import { parseStyledSegmentsInput } from '../engine/styledSegmentsNormalize.js';
import { ENGINE_MATRIX } from '../engine/phase-matrix.js';
import type {
  BlendMode,
  BooleanOperationNode,
  Effect,
  ComponentPropertyValue,
  InstanceNode,
  FileEnvelope,
  FontName,
  FrameNode,
  LayoutSizing,
  PageNode,
  Paint,
  SceneNode,
  StyledSegment,
  TextCase,
  TextDecoration,
  TextBoundVariableField,
  TextListOptions,
  TextNode,
  TextRangeStyle,
  TransformModifier,
  VectorNode,
} from '../model/types.js';
import { DEFAULT_FRAME_FILLS } from '../model/types.js';
import { createStylesApi } from '../styles/StylesAPI.js';
import {
  bindVariableToNodeField,
  canDeferSetBoundVariable,
  createVariablesApi,
} from '../variables/VariablesAPI.js';
import { assertGridChildLayoutField, GRID_CHILD_LAYOUT_FIELDS } from '../engine/gridChildValidate.js';
import { assertFigmaObjectAssignable } from '../engine/pluginObjectAssign.js';
import { writeSideStrokeWeight, type SideStrokeWeightTarget } from '../engine/sideStrokeWeights.js';
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

const TRAVERSAL_METHODS = new Set([
  'findAll',
  'findOne',
  'findChildren',
  'findChild',
  'findAllWithCriteria',
]);

const HANDLE_METHOD_KEYS = new Set([
  'remove',
  'appendChild',
  'insertChild',
  'resize',
  'clone',
  'duplicate',
  'getMainComponentAsync',
  'setProperties',
  'setComponentProperty',
  'setBoundVariable',
  'setFillStyleIdAsync',
  'setTextStyleIdAsync',
  'swapComponent',
  'detachInstance',
  'createInstance',
  'defaultVariant',
  'setExplicitVariableModeForCollection',
]);

function nodeExposesChildren(live: import('../model/types.js').AnyTreeNode): boolean {
  return (
    live.type === 'PAGE' ||
    live.type === 'FRAME' ||
    live.type === 'TRANSFORM_GROUP' ||
    live.type === 'GROUP' ||
    live.type === 'SECTION' ||
    live.type === 'BOOLEAN_OPERATION' ||
    live.type === 'COMPONENT' ||
    live.type === 'COMPONENT_SET' ||
    live.type === 'INSTANCE' ||
    live.type === 'COMPONENT_INSTANCE'
  );
}

function enumerateHandleKeys(live: import('../model/types.js').AnyTreeNode): string[] {
  const keys = new Set<string>(['id', 'type', 'name', HFC_HANDLE_FLAG]);
  const allowed = (ENGINE_MATRIX.patchKeysByType as Record<string, Set<string> | undefined>)[live.type];
  if (allowed) {
    for (const k of allowed) keys.add(k);
  }
  if (nodeExposesChildren(live)) {
    keys.add('children');
    for (const m of TRAVERSAL_METHODS) keys.add(m);
  }
  if (live.type === 'INSTANCE' || live.type === 'COMPONENT_INSTANCE') {
    keys.add('mainComponent');
    keys.add('componentProperties');
    keys.add('variantProperties');
    for (const m of [
      'getMainComponentAsync',
      'setProperties',
      'setComponentProperty',
      'swapComponent',
      'detachInstance',
    ]) {
      keys.add(m);
    }
  }
  if (live.type === 'COMPONENT') {
    keys.add('createInstance');
    keys.add('componentPropertyDefinitions');
  }
  if (live.type === 'COMPONENT_SET') {
    keys.add('defaultVariant');
    keys.add('createInstance');
  }
  for (const m of HANDLE_METHOD_KEYS) keys.add(m);
  return [...keys];
}

function resolveMainComponentHandle(
  ctx: ScriptContext,
  inst: InstanceNode | import('../model/types.js').ComponentInstanceNode
): unknown {
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
    return selectedComponentId ? createHandleProxy(ctx, selectedComponentId) : null;
  }
  if (main.type === 'COMPONENT_INSTANCE') return createHandleProxy(ctx, main.id);
  return null;
}

function mergeComponentPropertyValues(
  current: Record<string, ComponentPropertyValue> | undefined,
  values: Record<string, string | boolean>
): Record<string, ComponentPropertyValue> {
  const next: Record<string, ComponentPropertyValue> = { ...(current ?? {}) };
  for (const [key, raw] of Object.entries(values)) {
    const existing = current?.[key];
    if (existing?.type === 'VARIANT' || (typeof raw === 'string' && existing?.type === 'VARIANT')) {
      next[key] = { type: 'VARIANT', value: String(raw) };
    } else if (existing?.type === 'BOOLEAN' || typeof raw === 'boolean') {
      next[key] = { type: 'BOOLEAN', value: Boolean(raw) };
    } else if (existing?.type === 'INSTANCE_SWAP') {
      next[key] = { type: 'INSTANCE_SWAP', value: String(raw) };
    } else {
      next[key] = { type: 'TEXT', value: String(raw) };
    }
  }
  return next;
}

function createHandleProxy(ctx: ScriptContext, id: string): unknown {
  const traversal = () =>
    createTraversalMethods(
      { working: ctx.working, deletedIds: ctx.deletedIds, createHandle: (nid) => createHandleProxy(ctx, nid) },
      id
    );

  return new Proxy({ id, [HFC_HANDLE_MARKER]: true as const, [HFC_HANDLE_FLAG]: true as const }, {
    get(_t, prop) {
      if (prop === 'id') return id;
      if (prop === HFC_HANDLE_MARKER || prop === HFC_HANDLE_FLAG) return true;
      if (TRAVERSAL_METHODS.has(prop as string)) {
        return (traversal() as Record<string, unknown>)[prop as string];
      }
      if (prop === 'parent') {
        const par = findParentNode(ctx.working.document, id);
        if (!par) return null;
        if (par.type === 'DOCUMENT') {
          return { id: par.id, type: par.type, name: par.name };
        }
        return createHandleProxy(ctx, par.id);
      }
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
        if (!live || ctx.deletedIds.has(id) || (live.type !== 'INSTANCE' && live.type !== 'COMPONENT_INSTANCE')) {
          return null;
        }
        if (live.type === 'COMPONENT_INSTANCE') {
          return createHandleProxy(ctx, live.mainComponentId);
        }
        return resolveMainComponentHandle(ctx, live as InstanceNode);
      }
      if (prop === 'getMainComponentAsync') {
        return async (): Promise<unknown> => {
          const live = findEnvelopeNode(ctx.working, id);
          if (!live || ctx.deletedIds.has(id) || (live.type !== 'INSTANCE' && live.type !== 'COMPONENT_INSTANCE')) {
            return null;
          }
          if (live.type === 'COMPONENT_INSTANCE') {
            return createHandleProxy(ctx, live.mainComponentId);
          }
          return resolveMainComponentHandle(ctx, live as InstanceNode);
        };
      }
      if (prop === 'componentProperties') {
        const live = findEnvelopeNode(ctx.working, id);
        if (!live || ctx.deletedIds.has(id) || (live.type !== 'INSTANCE' && live.type !== 'COMPONENT_INSTANCE')) {
          return undefined;
        }
        return (live as InstanceNode).componentProperties;
      }
      if (prop === 'setProperties' || prop === 'setComponentProperty') {
        return (values: Record<string, string | boolean>): void => {
          const live = findEnvelopeNode(ctx.working, id);
          if (!live || ctx.deletedIds.has(id) || live.type !== 'INSTANCE') {
            throw new ValidationErr('VALIDATION_ERROR', `${String(prop)} requires INSTANCE node`);
          }
          const inst = live as InstanceNode;
          const next = mergeComponentPropertyValues(inst.componentProperties, values);
          queueUpdate(ctx, id, { componentProperties: next });
        };
      }
      if (prop === 'clone' || prop === 'duplicate') {
        return (): unknown => {
          if (ctx.deletedIds.has(id)) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
          const op: EngineOperation = { op: 'duplicateNode', nodeId: id };
          ctx.ops.push(op);
          const cloneId = applyEngineOp(ctx.working, op)!;
          return createHandleProxy(ctx, cloneId);
        };
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
        return (): unknown => {
          if (ctx.deletedIds.has(id)) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
          const live = findEnvelopeNode(ctx.working, id);
          if (!live || live.type !== 'INSTANCE') {
            throw new Error('detachInstance requires an attached INSTANCE node');
          }
          const op: EngineOperation = { op: 'detachInstance', nodeId: id };
          ctx.ops.push(op);
          const frameId = applyEngineOp(ctx.working, op)!;
          ctx.deletedIds.add(id);
          return createHandleProxy(ctx, frameId);
        };
      }
      if (prop === 'defaultVariant') {
        const live = findEnvelopeNode(ctx.working, id);
        if (!live || live.type !== 'COMPONENT_SET') return undefined;
        const set = live as import('../model/types.js').ComponentSetNode;
        const variantId = set.componentIds[0];
        if (!variantId) return undefined;
        return createHandleProxy(ctx, variantId);
      }
      if (prop === 'createInstance') {
        return (): unknown => {
          const live = findEnvelopeNode(ctx.working, id);
          if (!live || live.type !== 'COMPONENT') {
            throw new ValidationErr('VALIDATION_ERROR', 'createInstance is only supported on COMPONENT nodes');
          }
          return createComponentInstanceFromMainId(ctx, id);
        };
      }
      if (prop === 'setExplicitVariableModeForCollection') {
        return (collection: { id: string }, modeId: string): void => {
          const op: EngineOperation = {
            op: 'setVariableCollectionActiveMode',
            collectionId: collection.id,
            modeId,
          };
          ctx.ops.push(op);
          applyEnvelopeOperation(ctx.working, op);
        };
      }
      if (prop === 'setFillStyleIdAsync') {
        return async (styleId: string): Promise<void> => {
          if (!ctx.working.paintStyles?.some((s) => s.id === styleId)) {
            throw new ValidationErr('VALIDATION_ERROR', 'fillStyleId must reference an existing paint style');
          }
          queueUpdate(ctx, id, { fillStyleId: styleId });
        };
      }
      if (prop === 'setTextStyleIdAsync') {
        return async (styleId: string): Promise<void> => {
          const live = findEnvelopeNode(ctx.working, id);
          if (!live || live.type !== 'TEXT') {
            throw new ValidationErr('VALIDATION_ERROR', 'setTextStyleIdAsync is only supported on TEXT nodes');
          }
          if (!ctx.working.textStyles?.some((s) => s.id === styleId)) {
            throw new ValidationErr('VALIDATION_ERROR', 'textStyleId must reference an existing text style');
          }
          queueUpdate(ctx, id, { textStyleId: styleId });
        };
      }
      if (prop === 'resize') {
        return (w: number, h: number): void => {
          const live = findEnvelopeNode(ctx.working, id);
          const patch =
            live?.type === 'TEXT'
              ? {
                  width: w,
                  height: h,
                  layoutSizingHorizontal: 'FIXED' as const,
                  layoutSizingVertical: 'FIXED' as const,
                }
              : { width: w, height: h };
          queueUpdate(ctx, id, patch);
        };
      }
      if (prop === 'children') {
        const live = findEnvelopeNode(ctx.working, id);
        if (!live || ctx.deletedIds.has(id)) return [];
        return getImmediateSceneChildren(live, ctx.working)
          .filter((c) => !ctx.deletedIds.has(c.id))
          .map((c) => createHandleProxy(ctx, c.id));
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
    has(_t, prop) {
      if (prop === 'id' || prop === HFC_HANDLE_MARKER || prop === HFC_HANDLE_FLAG) return true;
      if (typeof prop === 'symbol') return false;
      const p = prop as string;
      if (TRAVERSAL_METHODS.has(p) || HANDLE_METHOD_KEYS.has(p)) return true;
      const live = findEnvelopeNode(ctx.working, id);
      if (!live || ctx.deletedIds.has(id)) return false;
      if (p === 'children') return nodeExposesChildren(live);
      if (p === 'parent') return findParentNode(ctx.working.document, id) !== null;
      if (p === 'mainComponent') return live.type === 'INSTANCE' || live.type === 'COMPONENT_INSTANCE';
      if (p === 'componentProperties') return live.type === 'INSTANCE' || live.type === 'COMPONENT_INSTANCE';
      if (p === 'variantProperties') return live.type === 'INSTANCE';
      if (p === 'componentPropertyDefinitions') return live.type === 'COMPONENT';
      if (isPatchKeyForType(live.type, p)) return true;
      return Object.prototype.hasOwnProperty.call(live, p);
    },
    ownKeys() {
      const live = findEnvelopeNode(ctx.working, id);
      if (!live || ctx.deletedIds.has(id)) return ['id', HFC_HANDLE_FLAG];
      return enumerateHandleKeys(live);
    },
    getOwnPropertyDescriptor(_t, prop) {
      if (typeof prop === 'string') {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    },
  });
}

function normalizeTextOnPathInput(value: unknown): RuntimeText['textOnPath'] {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationErr('VALIDATION_ERROR', 'textOnPath must be an object');
  }
  const v = value as Record<string, unknown>;
  const pathId = typeof v.pathId === 'string' ? v.pathId : typeof v.pathNodeId === 'string' ? v.pathNodeId : null;
  if (!pathId) throw new ValidationErr('VALIDATION_ERROR', 'textOnPath.pathId must be a node id');
  if (v.startOffset === undefined) return { pathId };
  if (typeof v.startOffset !== 'number' || !Number.isFinite(v.startOffset)) {
    throw new ValidationErr('VALIDATION_ERROR', 'textOnPath.startOffset must be a finite number');
  }
  return { pathId, startOffset: v.startOffset };
}

function runtimeMaySetLayoutSizingDetached(node: RuntimeSceneNode): boolean {
  if (node.type === 'FRAME') {
    const m = (node as { layoutMode?: FrameNode['layoutMode'] }).layoutMode;
    return m === 'HORIZONTAL' || m === 'VERTICAL' || m === 'GRID';
  }
  /** Shapes/text may set layout sizing before appendChild attaches them under an auto-layout parent. */
  return node.type !== 'PAGE' && node.type !== 'DOCUMENT';
}

const GRID_LAYOUT_PROP_SET = new Set<string>(GRID_CHILD_LAYOUT_FIELDS);

const SIDE_STROKE_PROPS: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
  strokeTopWeight: 'top',
  strokeRightWeight: 'right',
  strokeBottomWeight: 'bottom',
  strokeLeftWeight: 'left',
};

function wrapRuntimeNode<N extends RuntimeSceneNode>(node: N, ctx: ScriptContext): N {
  return new Proxy(node, {
    get(target, prop, receiver) {
      const p = prop as string;
      const nid = target.getAttachedIdOrNull();
      if (TRAVERSAL_METHODS.has(p)) {
        if (!target.attached || nid === null) {
          throw new ValidationErr(
            'VALIDATION_ERROR',
            `${p}: node must be appended to the document before traversal`
          );
        }
        return (createTraversalMethods(
          {
            working: ctx.working,
            deletedIds: ctx.deletedIds,
            createHandle: (nodeId) => createHandleProxy(ctx, nodeId),
          },
          nid
        ) as Record<string, unknown>)[p];
      }
      if (p === 'parent' && target.attached && nid !== null) {
        const par = findParentNode(ctx.working.document, nid);
        if (!par) return null;
        if (par.type === 'DOCUMENT') {
          return { id: par.id, type: par.type, name: par.name };
        }
        return createHandleProxy(ctx, par.id);
      }
      if (p === 'children' && target.attached && nid !== null) {
        const live = findEnvelopeNode(ctx.working, nid);
        if (!live) return [];
        return getImmediateSceneChildren(live, ctx.working)
          .filter((c) => !ctx.deletedIds.has(c.id))
          .map((c) => createHandleProxy(ctx, c.id));
      }
      if ((p === 'clone' || p === 'duplicate') && typeof Reflect.get(target, p, receiver) === 'function') {
        const fn = Reflect.get(target, p, receiver) as () => unknown;
        return fn.bind(target);
      }
      if (p === 'getMainComponentAsync' && target instanceof RuntimeComponentInstance) {
        return Reflect.get(target, p, receiver);
      }
      if (
        (p === 'setProperties' || p === 'setComponentProperty') &&
        target instanceof RuntimeComponentInstance
      ) {
        return Reflect.get(target, p, receiver);
      }
      return Reflect.get(target, prop, receiver);
    },
    has(target, prop) {
      if (prop === 'children') {
        if (target instanceof RuntimeComponentInstance) return true;
        if (target.attached && target.getAttachedIdOrNull() !== null) {
          const live = findEnvelopeNode(ctx.working, target.getAttachedIdOrNull()!);
          return live ? nodeExposesChildren(live) : false;
        }
        return target.type === 'FRAME' || target.type === 'TRANSFORM_GROUP';
      }
      if (prop === 'clone' || prop === 'duplicate') return true;
      if (prop === 'getMainComponentAsync' || prop === 'setProperties' || prop === 'setComponentProperty') {
        return target instanceof RuntimeComponentInstance;
      }
      return Reflect.has(target, prop);
    },
    set(target, prop, value, receiver) {
      const p = prop as string;
      if (GRID_LAYOUT_PROP_SET.has(p)) {
        const nodeId = target.getAttachedIdOrNull();
        if (!nodeId) {
          throw new ValidationErr(
            'VALIDATION_ERROR',
            `in set_${p}: Node must be a grid child to set ${p === 'gridRowSpan' ? 'row span' : p === 'gridColumnSpan' ? 'column span' : p}`
          );
        }
        assertGridChildLayoutField(ctx.working.document, nodeId, p as (typeof GRID_CHILD_LAYOUT_FIELDS)[number]);
      }
      if (target.type === 'TEXT' && p === 'listOptions') {
        assertFigmaObjectAssignable(
          Reflect.get(target, p, receiver) ?? Object.freeze({ type: 'NONE' }),
          value
        );
      }
      const sideStroke = SIDE_STROKE_PROPS[p];
      if (sideStroke && (target.type === 'RECTANGLE' || target.type === 'FRAME')) {
        const host = target as RuntimeSceneNode & SideStrokeWeightTarget;
        const next = writeSideStrokeWeight(host, sideStroke, value as number);
        if (target.attached && target.getAttachedIdOrNull() !== null) {
          queueUpdate(ctx, target.getAttachedIdOrNull()!, { individualStrokeWeights: next });
        }
        return true;
      }
      if (
        (target.type === 'FRAME' || target.type === 'RECTANGLE') &&
        p === 'individualStrokeWeights'
      ) {
        const strokes = Reflect.get(target, 'strokes', receiver) as Paint[] | undefined;
        if (strokes?.some((s) => s.type !== 'SOLID')) {
          throw new ValidationErr('VALIDATION_ERROR', 'object is not extensible');
        }
        const cur = Reflect.get(target, p, receiver);
        if (cur !== undefined) assertFigmaObjectAssignable(cur, value);
      }
      if ((target.type === 'FRAME' || target.type === 'RECTANGLE') && p === 'strokes') {
        const weights = Reflect.get(target, 'individualStrokeWeights', receiver);
        const paints = value as Paint[] | undefined;
        if (weights && paints?.some((s) => s.type !== 'SOLID')) {
          throw new ValidationErr('VALIDATION_ERROR', 'object is not extensible');
        }
      }
      if (p === 'layoutSizingHorizontal' || p === 'layoutSizingVertical') {
        if (!target.attached && !runtimeMaySetLayoutSizingDetached(target)) {
          throw new ValidationErr(
            'VALIDATION_ERROR',
            `${p}: node must be an auto-layout frame or a child of an auto-layout frame`
          );
        }
      }
      const skipAutoPatch = target.type === 'TEXT' && p === 'styledSegments';
      let normalized = value;
      if (target.type === 'TEXT' && p === 'textOnPath') {
        normalized = value === undefined || value === null ? undefined : normalizeTextOnPathInput(value);
      }
      if (
        !skipAutoPatch &&
        target.attached &&
        target.getAttachedIdOrNull() !== null &&
        isPatchKeyForType(target.type, p)
      ) {
        queueUpdate(ctx, target.getAttachedIdOrNull()!, { [p]: normalized });
      }
      return Reflect.set(target, prop, normalized, receiver);
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
  gridRowSpan?: number;
  gridColumnSpan?: number;
  gridRowAnchorIndex?: number;
  gridColumnAnchorIndex?: number;
  gridChildHorizontalAlign?: 'MIN' | 'CENTER' | 'MAX' | 'AUTO';
  gridChildVerticalAlign?: 'MIN' | 'CENTER' | 'MAX' | 'AUTO';
  protected _id: string | null = null;
  attached = false;
  protected ctx!: ScriptContext;
  private pendingChildren: Array<{ child: RuntimeSceneNode | { id: string }; index?: number }> = [];
  private pendingBoundVariables: Array<{ field: string; variable: { id: string } | null }> = [];

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

  /** Duplicate this node as a sibling (Figma `clone` / `duplicate`). */
  clone(): unknown {
    const nid = this.getAttachedIdOrNull();
    if (nid === null) {
      throw new ValidationErr('VALIDATION_ERROR', 'clone requires the node to be appended to the document');
    }
    const op: EngineOperation = { op: 'duplicateNode', nodeId: nid };
    this.ctx.ops.push(op);
    const cloneId = applyEngineOp(this.ctx.working, op)!;
    return createHandleProxy(this.ctx, cloneId);
  }

  duplicate(): unknown {
    return this.clone();
  }

  /** Used by script helpers outside subclasses (reparent / booleans). */
  getAttachedIdOrNull(): string | null {
    return this._id;
  }

  /** Plugin API: child sets its own grid anchor (not on the parent frame). */
  setGridChildPosition(rowIndex: number, columnIndex: number): void {
    const nodeId = this.getAttachedIdOrNull();
    if (!nodeId) {
      throw new ValidationErr(
        'VALIDATION_ERROR',
        'in set_gridRowAnchorIndex: Node must be a grid child to set row anchor'
      );
    }
    assertGridChildLayoutField(this.ctx.working.document, nodeId, 'gridRowAnchorIndex');
    this.gridRowAnchorIndex = rowIndex;
    this.gridColumnAnchorIndex = columnIndex;
    queueUpdate(this.ctx, nodeId, { gridRowAnchorIndex: rowIndex, gridColumnAnchorIndex: columnIndex });
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
    this.flushPendingBoundVariables();
  }

  protected flushPendingBoundVariables(): void {
    if (!this.attached || this._id === null) return;
    const pending = [...this.pendingBoundVariables];
    this.pendingBoundVariables = [];
    for (const { field, variable } of pending) {
      this.applyBoundVariable(field, variable);
    }
  }

  protected applyBoundVariable(field: string, variable: { id: string } | null): void {
    const patch = bindVariableToNodeField(
      this.ctx.working,
      this._id!,
      field as Parameters<typeof bindVariableToNodeField>[2],
      variable
    );
    if ('fills' in patch) {
      (this as { fills?: Paint[] }).fills = patch.fills as Paint[] | undefined;
    }
    if ('strokes' in patch) {
      (this as { strokes?: Paint[] }).strokes = patch.strokes as Paint[] | undefined;
    }
    queueUpdate(this.ctx, this._id!, patch);
  }

  setBoundVariable(field: string, variable: { id: string } | null): void {
    if (!this.attached || this._id === null) {
      if (canDeferSetBoundVariable(this.type, field)) {
        this.pendingBoundVariables.push({ field, variable });
        return;
      }
      throw new Error('setBoundVariable requires the node to be appended to the document');
    }
    this.applyBoundVariable(field, variable);
  }

  async setFillStyleIdAsync(styleId: string): Promise<void> {
    if (!this.ctx.working.paintStyles?.some((s) => s.id === styleId)) {
      throw new ValidationErr('VALIDATION_ERROR', 'fillStyleId must reference an existing paint style');
    }
    (this as { fillStyleId?: string }).fillStyleId = styleId;
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, { fillStyleId: styleId });
    }
  }

  setExplicitVariableModeForCollection(collection: { id: string }, modeId: string): void {
    const op: EngineOperation = {
      op: 'setVariableCollectionActiveMode',
      collectionId: collection.id,
      modeId,
    };
    this.ctx.ops.push(op);
    applyEnvelopeOperation(this.ctx.working, op);
  }

  /** Figma-compatible async fills setter (required for pattern paints). */
  async setFillsAsync(paints: Paint[]): Promise<void> {
    (this as { fills?: Paint[] }).fills = paints;
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, { fills: paints });
    }
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
      gridRowSpan: this.gridRowSpan,
      gridColumnSpan: this.gridColumnSpan,
      gridRowAnchorIndex: this.gridRowAnchorIndex,
      gridColumnAnchorIndex: this.gridColumnAnchorIndex,
      gridChildHorizontalAlign: this.gridChildHorizontalAlign,
      gridChildVerticalAlign: this.gridChildVerticalAlign,
    };
  }
}

class RuntimeFrame extends RuntimeSceneNode {
  readonly type = 'FRAME' as const;
  name = 'Frame';
  fills: FrameNode['fills'] = [...DEFAULT_FRAME_FILLS];
  strokes?: FrameNode['strokes'];
  strokeWeight?: number;
  strokeAlign?: FrameNode['strokeAlign'];
  strokeCap?: FrameNode['strokeCap'];
  strokeJoin?: FrameNode['strokeJoin'];
  miterLimit?: number;
  dashPattern?: number[];
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  backgrounds?: Paint[];
  clipsContent?: boolean;
  layoutMode?: FrameNode['layoutMode'];
  layoutWrap?: FrameNode['layoutWrap'];
  itemSpacing?: number;
  counterAxisSpacing?: number;
  counterAxisAlignContent?: FrameNode['counterAxisAlignContent'];
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: FrameNode['primaryAxisAlignItems'];
  counterAxisAlignItems?: FrameNode['counterAxisAlignItems'];
  primaryAxisSizingMode?: LayoutSizing;
  counterAxisSizingMode?: LayoutSizing;
  layoutGrids?: FrameNode['layoutGrids'];
  itemReverseZIndex?: boolean;
  strokesIncludedInLayout?: boolean;
  cornerSmoothing?: number;
  individualStrokeWeights?: FrameNode['individualStrokeWeights'];
  fillStyleId?: string;
  strokeStyleId?: string;
  effectStyleId?: string;
  gridStyleId?: string;
  gridRowCount?: number;
  gridColumnCount?: number;
  gridRowGap?: number;
  gridColumnGap?: number;
  gridRowSizes?: FrameNode['gridRowSizes'];
  gridColumnSizes?: FrameNode['gridColumnSizes'];

  appendChildAt(child: RuntimeSceneNode | { id: string }, rowIndex: number, columnIndex: number): void {
    this.appendChild(child);
    const cid = readChildId(child);
    if (child instanceof RuntimeSceneNode) {
      child.gridRowAnchorIndex = rowIndex;
      child.gridColumnAnchorIndex = columnIndex;
    }
    if (this.attached && this._id !== null && cid) {
      queueUpdate(this.ctx, cid, { gridRowAnchorIndex: rowIndex, gridColumnAnchorIndex: columnIndex });
    }
  }

  appendChild(child: RuntimeSceneNode | { id: string }, index?: number): void {
    this.appendChildInternal(child, index);
  }

  insertChild(index: number, child: RuntimeSceneNode | { id: string }): void {
    this.appendChild(child, index);
  }

  get children(): unknown[] {
    if (!this.attached || this._id === null) return [];
    const live = findEnvelopeNode(this.ctx.working, this._id);
    if (!live || live.type !== 'FRAME') return [];
    return live.children
      .filter((c) => !this.ctx.deletedIds.has(c.id))
      .map((c) => createHandleProxy(this.ctx, c.id));
  }

  get fillGeometry(): { windingRule: string; data: string }[] {
    return computeFillGeometry(this.liveFrameOrThrow());
  }

  get strokeGeometry(): { windingRule: string; data: string }[] {
    return computeStrokeGeometry(this.liveFrameOrThrow());
  }

  outlineStroke(): VectorNode | null {
    return outlineStrokeToVector(this.liveFrameOrThrow());
  }

  private liveFrameOrThrow(): FrameNode {
    if (!this.attached || !this._id) throw new Error('Frame must be attached');
    const live = findEnvelopeNode(this.ctx.working, this._id);
    if (!live || live.type !== 'FRAME') throw new Error('Frame not found');
    return live;
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    if (this.layoutMode === 'HORIZONTAL' || this.layoutMode === 'VERTICAL' || this.layoutMode === 'GRID') {
      this.primaryAxisSizingMode = 'FIXED';
      this.counterAxisSizingMode = 'FIXED';
    }
    if (this.attached && this._id !== null) {
      const patch: Record<string, unknown> = { width: w, height: h };
      if (this.layoutMode === 'HORIZONTAL' || this.layoutMode === 'VERTICAL') {
        patch.primaryAxisSizingMode = 'FIXED';
        patch.counterAxisSizingMode = 'FIXED';
      }
      queueUpdate(this.ctx, this._id, patch);
    }
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
      cornerRadius: this.cornerRadius,
      topLeftRadius: this.topLeftRadius,
      topRightRadius: this.topRightRadius,
      bottomRightRadius: this.bottomRightRadius,
      bottomLeftRadius: this.bottomLeftRadius,
      effects: this.effects,
      clipsContent: this.clipsContent,
      layoutMode: this.layoutMode,
      layoutWrap: this.layoutWrap,
      itemSpacing: this.itemSpacing,
      counterAxisSpacing: this.counterAxisSpacing,
      counterAxisAlignContent: this.counterAxisAlignContent,
      paddingLeft: this.paddingLeft,
      paddingRight: this.paddingRight,
      paddingTop: this.paddingTop,
      paddingBottom: this.paddingBottom,
      primaryAxisAlignItems: this.primaryAxisAlignItems,
      counterAxisAlignItems: this.counterAxisAlignItems,
      primaryAxisSizingMode: this.primaryAxisSizingMode,
      counterAxisSizingMode: this.counterAxisSizingMode,
      layoutGrids: this.layoutGrids,
      itemReverseZIndex: this.itemReverseZIndex,
      strokesIncludedInLayout: this.strokesIncludedInLayout,
      cornerSmoothing: this.cornerSmoothing,
      individualStrokeWeights: this.individualStrokeWeights,
      fillStyleId: this.fillStyleId,
      strokeStyleId: this.strokeStyleId,
      effectStyleId: this.effectStyleId,
      gridStyleId: this.gridStyleId,
      gridRowCount: this.gridRowCount,
      gridColumnCount: this.gridColumnCount,
      gridRowGap: this.gridRowGap,
      gridColumnGap: this.gridColumnGap,
      gridRowSizes: this.gridRowSizes,
      gridColumnSizes: this.gridColumnSizes,
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
  width = 0;
  height = 0;
  characters = '';
  fontSize = 12;
  fontWeight = 400;
  fills?: FrameNode['fills'];
  textStyleId?: string;
  textOnPath?: { pathId: string; startOffset?: number };
  lineHeight?: TextNode['lineHeight'];
  letterSpacing?: TextNode['letterSpacing'];
  leadingTrim?: TextNode['leadingTrim'];
  paragraphIndent?: number;
  paragraphSpacing?: number;
  listSpacing?: number;
  hangingPunctuation?: boolean;
  hangingList?: boolean;
  listOptions: TextNode['listOptions'] = Object.freeze({ type: 'NONE' });
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: TextNode['strokeAlign'];
  fillStyleId?: string;
  strokeStyleId?: string;
  effectStyleId?: string;
  private segments: StyledSegment[] = [];

  get styledSegments(): StyledSegment[] {
    return [...this.segments];
  }

  set styledSegments(raw: unknown) {
    this.segments = parseStyledSegmentsInput(raw) ?? [];
    this.syncStyledSegments();
  }

  async setTextStyleIdAsync(styleId: string): Promise<void> {
    if (!this.ctx.working.textStyles?.some((s) => s.id === styleId)) {
      throw new ValidationErr('VALIDATION_ERROR', 'textStyleId must reference an existing text style');
    }
    this.textStyleId = styleId;
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, { textStyleId: styleId });
    }
  }

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
      strokes: this.strokes,
      strokeWeight: this.strokeWeight,
      strokeAlign: this.strokeAlign,
      lineHeight: this.lineHeight,
      letterSpacing: this.letterSpacing,
      leadingTrim: this.leadingTrim,
      paragraphIndent: this.paragraphIndent,
      paragraphSpacing: this.paragraphSpacing,
      listSpacing: this.listSpacing,
      hangingPunctuation: this.hangingPunctuation,
      hangingList: this.hangingList,
      listOptions: this.listOptions,
      styledSegments: this.segments.length ? this.segments : undefined,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      ...this.layoutSelfSpec(),
      textStyleId: this.textStyleId,
      fillStyleId: this.fillStyleId,
      strokeStyleId: this.strokeStyleId,
      effectStyleId: this.effectStyleId,
      textOnPath: this.textOnPath,
    };
  }

  private applyRangeStyle(start: number, end: number, patch: Partial<TextRangeStyle>): void {
    const i = this.segments.findIndex((s) => s.start === start && s.end === end);
    if (i >= 0) {
      this.segments[i] = { start, end, style: { ...this.segments[i]!.style, ...patch } };
    } else {
      this.segments.push({ start, end, style: { ...patch } });
    }
    this.syncStyledSegments();
  }

  private syncStyledSegments(): void {
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, { styledSegments: [...this.segments] });
    }
  }

  setRangeFontSize(start: number, end: number, fontSize: number): void {
    this.applyRangeStyle(start, end, { fontSize });
  }

  setRangeFills(start: number, end: number, fills: Paint[]): void {
    this.applyRangeStyle(start, end, { fills: deepClone(fills) });
  }

  getStyledTextSegments(
    fields: Array<keyof TextRangeStyle>,
    start = 0,
    end = this.characters.length
  ): Array<{ start: number; end: number } & Partial<TextRangeStyle>> {
    const out: Array<{ start: number; end: number } & Partial<TextRangeStyle>> = [];
    const segs = [...this.segments].sort((a, b) => a.start - b.start);
    let i = start;
    while (i < end) {
      const seg = segs.find((s) => s.start <= i && s.end > i);
      const slice: { start: number; end: number } & Partial<TextRangeStyle> = {
        start: i,
        end: seg ? Math.min(seg.end, end) : end,
      };
      const style = seg?.style ?? {};
      for (const f of fields) {
        if (f in style) (slice as Record<string, unknown>)[f] = style[f];
        else if (f === 'fontSize' && this.fontSize !== undefined) slice.fontSize = this.fontSize;
        else if (f === 'fontWeight' && this.fontWeight !== undefined) slice.fontWeight = this.fontWeight;
        else if (f === 'fills' && this.fills) slice.fills = this.fills;
      }
      out.push(slice);
      i = slice.end;
    }
    return out;
  }

  setRangeLineHeight(start: number, end: number, lineHeight: TextNode['lineHeight']): void {
    this.applyRangeStyle(start, end, { lineHeight });
  }

  setRangeLetterSpacing(start: number, end: number, letterSpacing: TextNode['letterSpacing']): void {
    this.applyRangeStyle(start, end, { letterSpacing });
  }

  setRangeTextCase(start: number, end: number, textCase: TextCase): void {
    this.applyRangeStyle(start, end, { textCase });
  }

  setRangeTextDecoration(start: number, end: number, textDecoration: TextDecoration): void {
    this.applyRangeStyle(start, end, { textDecoration });
  }

  setRangeListOptions(start: number, end: number, listOptions: TextListOptions): void {
    this.applyRangeStyle(start, end, { listOptions });
  }

  setRangeFontName(start: number, end: number, fontName: FontName): void {
    this.applyRangeStyle(start, end, { fontName });
  }

  setRangeBoundVariable(
    start: number,
    end: number,
    field: TextBoundVariableField,
    variable: { id: string } | null
  ): void {
    const allowed: TextBoundVariableField[] = [
      'fontFamily',
      'fontSize',
      'fontStyle',
      'fontWeight',
      'letterSpacing',
      'lineHeight',
      'paragraphSpacing',
      'paragraphIndent',
    ];
    if (!allowed.includes(field)) {
      throw new ValidationErr('VALIDATION_ERROR', `setRangeBoundVariable: unsupported field ${field}`);
    }
    const i = this.segments.findIndex((s) => s.start === start && s.end === end);
    const prev = i >= 0 ? { ...(this.segments[i]!.style.boundVariables ?? {}) } : {};
    if (variable === null) {
      delete prev[field];
    } else {
      prev[field] = variable.id;
    }
    const boundVariables = Object.keys(prev).length ? prev : undefined;
    this.applyRangeStyle(start, end, { boundVariables });
  }

  setRangeHyperlink(
    start: number,
    end: number,
    link: { type: 'URL'; url?: string; value?: string } | null
  ): void {
    if (link === null) {
      const i = this.segments.findIndex((s) => s.start === start && s.end === end);
      if (i >= 0) {
        const next = { ...this.segments[i]!.style };
        delete next.hyperlink;
        this.segments[i] = { start, end, style: next };
        this.syncStyledSegments();
      }
      return;
    }
    const url = link.url ?? link.value;
    if (!url) return;
    this.applyRangeStyle(start, end, { hyperlink: { type: 'URL', url } });
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.layoutSizingHorizontal = 'FIXED';
    this.layoutSizingVertical = 'FIXED';
    if (this.attached && this._id !== null) {
      queueUpdate(this.ctx, this._id, {
        width: w,
        height: h,
        layoutSizingHorizontal: 'FIXED',
        layoutSizingVertical: 'FIXED',
      });
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
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  cornerSmoothing?: number;
  individualStrokeWeights?: FrameNode['individualStrokeWeights'];
  fillStyleId?: string;
  effectStyleId?: string;

  get fillGeometry(): { windingRule: string; data: string }[] {
    return computeFillGeometry(this.liveRectOrThrow());
  }

  get strokeGeometry(): { windingRule: string; data: string }[] {
    return computeStrokeGeometry(this.liveRectOrThrow());
  }

  outlineStroke(): VectorNode | null {
    return outlineStrokeToVector(this.liveRectOrThrow());
  }

  private liveRectOrThrow(): import('../model/types.js').RectangleNode {
    if (!this.attached || !this._id) throw new Error('Rectangle must be attached');
    const live = findEnvelopeNode(this.ctx.working, this._id);
    if (!live || live.type !== 'RECTANGLE') throw new Error('Rectangle not found');
    return live;
  }

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
      topLeftRadius: this.topLeftRadius,
      topRightRadius: this.topRightRadius,
      bottomRightRadius: this.bottomRightRadius,
      bottomLeftRadius: this.bottomLeftRadius,
      cornerSmoothing: this.cornerSmoothing,
      individualStrokeWeights: this.individualStrokeWeights,
      effects: this.effects,
      visible: this.visible,
      opacity: this.opacity,
      rotation: this.rotation,
      blendMode: this.blendMode,
      ...this.layoutSelfSpec(),
      fillStyleId: this.fillStyleId,
      effectStyleId: this.effectStyleId,
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
      ...this.layoutSelfSpec(),
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
  strokes: Paint[] = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  strokeWeight = 1;
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
  transformModifiers: TransformModifier[] = [];

  appendChild(child: RuntimeSceneNode | { id: string }, index?: number): void {
    this.appendChildInternal(child, index);
  }

  insertChild(index: number, child: RuntimeSceneNode | { id: string }): void {
    this.appendChild(child, index);
  }

  get children(): unknown[] {
    if (!this.attached || this._id === null) return [];
    const live = findEnvelopeNode(this.ctx.working, this._id);
    if (!live || live.type !== 'TRANSFORM_GROUP') return [];
    return live.children
      .filter((c) => !this.ctx.deletedIds.has(c.id))
      .map((c) => createHandleProxy(this.ctx, c.id));
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
      transformModifiers: this.transformModifiers.length > 0 ? [...this.transformModifiers] : undefined,
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

  async getMainComponentAsync(): Promise<unknown> {
    return this.mainComponent;
  }

  setProperties(values: Record<string, string | boolean>): void {
    const nid = this.getAttachedIdOrNull();
    if (nid === null) {
      throw new ValidationErr('VALIDATION_ERROR', 'setProperties requires the instance to be appended');
    }
    const next = mergeComponentPropertyValues(this.componentProperties, values);
    this.componentProperties = next;
    queueUpdate(this.ctx, nid, { componentProperties: next });
  }

  setComponentProperty(values: Record<string, string | boolean>): void {
    this.setProperties(values);
  }

  get children(): unknown[] {
    if (!this.attached || this._id === null) return [];
    const live = findEnvelopeNode(this.ctx.working, this._id);
    if (!live || live.type !== 'INSTANCE') return [];
    return getImmediateSceneChildren(live, this.ctx.working)
      .filter((c) => !this.ctx.deletedIds.has(c.id))
      .map((c) => createHandleProxy(this.ctx, c.id));
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

  detachInstance(): unknown {
    const nid = this.getAttachedIdOrNull();
    if (!nid) {
      throw new Error('detachInstance requires an attached INSTANCE node');
    }
    const op: EngineOperation = { op: 'detachInstance', nodeId: nid };
    this.ctx.ops.push(op);
    const frameId = applyEngineOp(this.ctx.working, op)!;
    this.ctx.deletedIds.add(nid);
    this._id = frameId;
    this.attached = true;
    return createHandleProxy(this.ctx, frameId);
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

  get type(): 'PAGE' {
    return 'PAGE';
  }

  get name(): string {
    return this.livePageOrNull()?.name ?? '';
  }

  set name(value: string) {
    queueUpdate(this.ctx, this.pageId, { name: value });
  }

  get isPageDivider(): boolean | undefined {
    return this.livePageOrNull()?.isPageDivider;
  }

  private livePageOrNull(): PageNode | null {
    const p = findEnvelopeNode(this.ctx.working, this.pageId);
    return p && p.type === 'PAGE' ? p : null;
  }

  get x(): number | undefined {
    return this.livePageOrNull()?.x;
  }

  get y(): number | undefined {
    return this.livePageOrNull()?.y;
  }

  get width(): number | undefined {
    return this.livePageOrNull()?.width;
  }

  get height(): number | undefined {
    return this.livePageOrNull()?.height;
  }

  get visible(): boolean | undefined {
    return this.livePageOrNull()?.visible;
  }

  findAll(callback?: unknown): unknown[] {
    return createTraversalMethods(
      {
        working: this.ctx.working,
        deletedIds: this.ctx.deletedIds,
        createHandle: (nid) => createHandleProxy(this.ctx, nid),
      },
      this.pageId
    ).findAll(callback);
  }

  findOne(callback: unknown): unknown | null {
    return createTraversalMethods(
      {
        working: this.ctx.working,
        deletedIds: this.ctx.deletedIds,
        createHandle: (nid) => createHandleProxy(this.ctx, nid),
      },
      this.pageId
    ).findOne(callback);
  }

  findChildren(callback?: unknown): unknown[] {
    return createTraversalMethods(
      {
        working: this.ctx.working,
        deletedIds: this.ctx.deletedIds,
        createHandle: (nid) => createHandleProxy(this.ctx, nid),
      },
      this.pageId
    ).findChildren(callback);
  }

  findChild(callback: unknown): unknown | null {
    return createTraversalMethods(
      {
        working: this.ctx.working,
        deletedIds: this.ctx.deletedIds,
        createHandle: (nid) => createHandleProxy(this.ctx, nid),
      },
      this.pageId
    ).findChild(callback);
  }

  findAllWithCriteria(criteria: unknown): unknown[] {
    return createTraversalMethods(
      {
        working: this.ctx.working,
        deletedIds: this.ctx.deletedIds,
        createHandle: (nid) => createHandleProxy(this.ctx, nid),
      },
      this.pageId
    ).findAllWithCriteria(criteria);
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

  get children(): unknown[] {
    const p = findEnvelopeNode(this.ctx.working, this.pageId);
    if (!p || p.type !== 'PAGE') return [];
    return getImmediateSceneChildren(p, this.ctx.working)
      .filter((c) => !this.ctx.deletedIds.has(c.id))
      .map((c) => createHandleProxy(this.ctx, c.id));
  }

  get backgrounds(): Paint[] | undefined {
    const p = findEnvelopeNode(this.ctx.working, this.pageId);
    if (!p || p.type !== 'PAGE') return undefined;
    return p.backgrounds;
  }

  set backgrounds(value: Paint[] | undefined) {
    queueUpdate(this.ctx, this.pageId, { backgrounds: value });
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
  const operands: SceneNode[] = [];
  for (const n of nodes) {
    const id = readOperandId(n);
    const live = findEnvelopeNode(ctx.working, id);
    if (!live || ctx.deletedIds.has(id)) {
      throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
    }
    if (!BOOLEAN_OPERAND_TYPES.has(live.type)) {
      throw new ValidationErr('VALIDATION_ERROR', `Boolean operand must be RECTANGLE, ELLIPSE, POLYGON, STAR, or VECTOR (got ${live.type})`);
    }
    operands.push(live as SceneNode);
  }
  const box = boundsOfNodes(operands);
  const createOp: EngineOperation = {
    op: 'createNode',
    parentId,
    index,
    node: {
      type: 'BOOLEAN_OPERATION',
      name: 'Boolean',
      booleanOperation,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    },
  };
  ctx.ops.push(createOp);
  const boolId = applyEngineOp(ctx.working, createOp)!;
  for (let i = 0; i < operands.length; i++) {
    const op = operands[i]!;
    const nid = op.id;
    const relX = op.x - box.x;
    const relY = op.y - box.y;
    const mv: EngineOperation = { op: 'moveNode', nodeId: nid, newParentId: boolId, index: i };
    ctx.ops.push(mv);
    applyEngineOp(ctx.working, mv);
    const up: EngineOperation = { op: 'updateNode', nodeId: nid, patch: { x: relX, y: relY } };
    ctx.ops.push(up);
    applyEngineOp(ctx.working, up);
  }
  return createHandleProxy(ctx, boolId);
}

const AsyncFunction = Object.getPrototypeOf(async function () {
  /* noop */
}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;

export interface RunUseFigmaScriptOk {
  kind: 'ok';
  operations: EngineOperation[];
  /** Active page after the script completes (for engine session persistence). */
  currentPageId: string;
  /** JSON-serializable return value from the script (Figma serializes `return` for the agent). */
  result: unknown;
  /** Warnings from return-value snapshot (depth/node budget, etc.). */
  snapshotWarnings: string[];
}

export interface RunUseFigmaScriptErr {
  kind: 'error';
  errorCode: string;
  message: string;
}

function createComponentInstanceFromMainId(
  ctx: ScriptContext,
  mainComponentId: string
): RuntimeComponentInstance {
  const main = findEnvelopeNode(ctx.working, mainComponentId);
  if (
    !main ||
    (main.type !== 'COMPONENT' && main.type !== 'COMPONENT_SET' && main.type !== 'COMPONENT_INSTANCE')
  ) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `createComponentInstance: unknown main component ${mainComponentId}`
    );
  }
  const n = new RuntimeComponentInstance().bindContext(ctx);
  n.mainComponentId = mainComponentId;
  if (main.type === 'COMPONENT') {
    n.width = main.width;
    n.height = main.height;
  }
  if (main.type === 'COMPONENT_SET') {
    const set = main as import('../model/types.js').ComponentSetNode;
    const key = set.variantPropertyKey ?? 'variant';
    const firstOption =
      set.variantOptions?.[0] ??
      (findEnvelopeNode(ctx.working, set.componentIds[0]) as { name?: string } | null)?.name ??
      (set.componentIds[0] ?? '');
    n.componentProperties = { [key]: { type: 'VARIANT', value: String(firstOption) } };
  }
  return wrapRuntimeNode(n, ctx);
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
  let currentPageId = engine.getCurrentPageId() ?? firstPage.id;
  if (!ctx.working.document.children.some((c) => c.type === 'PAGE' && c.id === currentPageId)) {
    currentPageId = firstPage.id;
  }
  ctx.selectionByPageId.set(currentPageId, []);
  const networkPolicy = loadNetworkPolicyFromEnv();
  const variablesApi = createVariablesApi(ctx);
  const stylesApi = createStylesApi(ctx);

  const figma = {
    root: {
      get id(): string {
        return ctx.working.document.id;
      },
      get type(): 'DOCUMENT' {
        return 'DOCUMENT';
      },
      get name(): string {
        return ctx.working.document.name;
      },
      set name(value: string) {
        queueUpdate(ctx, ctx.working.document.id, { name: value });
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
      return createComponentInstanceFromMainId(ctx, mainComponentId);
    },
    createInstance(componentOrId: string | { id: string }): RuntimeComponentInstance {
      const mainComponentId = typeof componentOrId === 'string' ? componentOrId : componentOrId.id;
      return createComponentInstanceFromMainId(ctx, mainComponentId);
    },
    importComponentByKeyAsync: async (key: string): Promise<unknown> => {
      const componentId = findComponentIdByKey(ctx.working, key);
      if (!componentId) {
        throw new ValidationErr(
          'VALIDATION_ERROR',
          `importComponentByKeyAsync: no local component with key ${key}`
        );
      }
      return createHandleProxy(ctx, componentId);
    },
    loadAllPagesAsync: async (): Promise<void> => {},
    listAvailableFontsAsync: async (): Promise<FontName[]> => listAvailableFonts(),
    loadFontAsync: async (fontName: FontName): Promise<void> => loadFontAsync(fontName),
    hasMissingFont: (): boolean => hasMissingFont(ctx.working),
    base64Encode: (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64'),
    base64Decode: (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'base64')),
    createImage: (bytes: Uint8Array): { hash: string } => {
      const buf = Buffer.from(bytes);
      const { hash } = registerAssetBytesInEnvelope(ctx.working, buf, 'image/png');
      ctx.ops.push({ op: 'registerAssetBytes', mimeType: 'image/png', dataBase64: buf.toString('base64') });
      return { hash };
    },
    createImageAsync: async (src: string): Promise<{ hash: string }> => {
      const bytes = await fetchBytes(networkPolicy, src);
      const buf = Buffer.from(bytes);
      const { hash } = registerAssetBytesInEnvelope(ctx.working, buf, 'image/png');
      ctx.ops.push({ op: 'registerAssetBytes', mimeType: 'image/png', dataBase64: buf.toString('base64') });
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
      index: number,
      modifiers: ReadonlyArray<Record<string, unknown>>
    ): unknown => {
      const transformModifiers = validateTransformModifiers(modifiers, 'transformGroup');
      const parentId = 'pageId' in parent ? parent.pageId : parent.id;
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
        throw new ValidationErr('VALIDATION_ERROR', 'transformGroup index must be a non-negative integer');
      }
      const createOp = {
        op: 'createNode' as const,
        parentId,
        index,
        node: {
          type: 'TRANSFORM_GROUP' as const,
          name: 'Transform Group',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          transformModifiers: transformModifiers.length > 0 ? transformModifiers : undefined,
        },
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
    createAutoLayout: (direction?: 'HORIZONTAL' | 'VERTICAL'): RuntimeFrame => {
      const f = new RuntimeFrame();
      if (direction === 'VERTICAL') {
        f.layoutMode = 'VERTICAL';
        /** Explicit vertical AL: primary (height) hugs; cross-axis width keeps default until resize (symmetric to HORIZONTAL). */
        f.primaryAxisSizingMode = 'HUG';
        f.counterAxisSizingMode = 'FIXED';
      } else if (direction === 'HORIZONTAL') {
        f.layoutMode = 'HORIZONTAL';
        /** Explicit horizontal AL: cross-axis keeps default frame height until resize (Figma pill pattern). */
        f.primaryAxisSizingMode = 'HUG';
        f.counterAxisSizingMode = 'FIXED';
      } else {
        /** `createAutoLayout()` no-arg: both axes hug (toolbars, stacks); not the explicit-HORIZONTAL pill case. */
        f.layoutMode = 'HORIZONTAL';
        f.primaryAxisSizingMode = 'HUG';
        f.counterAxisSizingMode = 'HUG';
      }
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
    createTextPath: (
      node: RuntimeVector | RuntimeSceneNode | { id: string },
      startSegment: number,
      startPosition: number
    ): RuntimeText => {
      if (typeof startSegment !== 'number' || !Number.isFinite(startSegment)) {
        throw new ValidationErr('VALIDATION_ERROR', 'createTextPath: startSegment must be a finite number');
      }
      if (typeof startPosition !== 'number' || !Number.isFinite(startPosition) || startPosition < 0 || startPosition > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'createTextPath: startPosition must be a number from 0 to 1');
      }
      void startSegment;
      const pathId = readOperandId(node);
      const live = findEnvelopeNode(ctx.working, pathId);
      if (!live || live.type !== 'VECTOR') {
        throw new ValidationErr('VALIDATION_ERROR', 'createTextPath: node must be a VECTOR');
      }
      const t = new RuntimeText().bindContext(ctx);
      t.name = 'Text Path';
      t.x = live.x;
      t.y = live.y;
      t.x = live.x;
      t.y = live.y;
      const pathData = live.vectorPaths?.[0]?.data;
      if (pathData) {
        const norm = normalizePathDataToOrigin(pathData);
        t.width = norm.width;
        t.height = norm.height;
      } else {
        t.width = live.width;
        t.height = live.height;
      }
      t.textOnPath = { pathId, startOffset: startPosition };
      return wrapRuntimeNode(t, ctx);
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

  let result: unknown = null;
  let snapshotWarnings: string[] = [];
  if (rawResult !== undefined) {
    const snap = snapshotForReturn(rawResult, {
      working: ctx.working,
      deletedIds: ctx.deletedIds,
    });
    result = snap.value;
    snapshotWarnings = snap.warnings;
  }

  return { kind: 'ok', operations: ctx.ops, currentPageId, result, snapshotWarnings };
}
