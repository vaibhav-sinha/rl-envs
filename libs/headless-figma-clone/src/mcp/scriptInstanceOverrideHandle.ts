import type { ComponentOverrideFields, TextNode } from '../model/types.js';
import { ENGINE_MATRIX } from '../engine/phase-matrix.js';
import { throwIfAborted } from './inFlightAbort.js';
import {
  createInstanceOverrideTextMethods,
  TEXT_HANDLE_METHOD_KEYS,
} from './scriptTextMethods.js';
import { ValidationErr } from '../util/errors.js';
import { HFC_HANDLE_FLAG, HFC_HANDLE_MARKER } from './scriptNodeSnapshot.js';

/** Detached runtime instance that accumulates master-keyed overrides before appendChild. */
export interface InstanceOverrideOwner {
  type: 'INSTANCE';
  overrides?: Record<string, ComponentOverrideFields>;
  getInstanceReservedId(): string | null;
}

export interface InstanceOverrideHandleContext {
  signal?: AbortSignal;
  lookupMasterNode: (masterNodeId: string) => { type: string; name?: string; [key: string]: unknown } | null;
  lookupMasterText: (masterNodeId: string) => TextNode | null;
  touchInstance: (instanceReservedId: string) => void;
  /** When the owning instance is in the document, duplicate the mapped subtree node. */
  cloneOverrideNode?: (masterNodeId: string) => unknown;
}

function isPatchKeyForType(nodeType: string, key: string): boolean {
  const m = ENGINE_MATRIX.patchKeysByType as Record<string, Set<string> | undefined>;
  return Boolean(m[nodeType]?.has(key));
}

function mergedField(
  master: Record<string, unknown>,
  override: ComponentOverrideFields | undefined,
  key: string
): unknown {
  if (override && key in override && override[key as keyof ComponentOverrideFields] !== undefined) {
    return override[key as keyof ComponentOverrideFields];
  }
  return master[key];
}

function applyOverridePatch(
  owner: InstanceOverrideOwner,
  masterNodeId: string,
  masterType: string,
  patch: Record<string, unknown>,
  ctx: InstanceOverrideHandleContext
): void {
  for (const [k, v] of Object.entries(patch)) {
    if (!isPatchKeyForType(masterType, k)) {
      throw new ValidationErr('UNSUPPORTED_PROPERTY', `Unsupported patch key: ${k}`);
    }
    if (v === undefined) continue;
  }
  const prev = owner.overrides?.[masterNodeId] ?? {};
  owner.overrides = {
    ...(owner.overrides ?? {}),
    [masterNodeId]: { ...prev, ...(patch as ComponentOverrideFields) },
  };
  const instanceId = owner.getInstanceReservedId();
  if (instanceId) ctx.touchInstance(instanceId);
}

export function createInstanceOverrideHandle(
  ctx: InstanceOverrideHandleContext,
  owner: InstanceOverrideOwner,
  masterNodeId: string
): unknown {
  let cachedTextMethods: Record<string, unknown> | null = null;
  const textMethods = (): Record<string, unknown> => {
    if (!cachedTextMethods) {
      cachedTextMethods = createInstanceOverrideTextMethods(
        {
          get overrides() {
            return owner.overrides;
          },
          lookupMasterText: ctx.lookupMasterText,
          applyOverride: (id, patch) => {
            const master = ctx.lookupMasterNode(id);
            if (!master) {
              throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
            }
            applyOverridePatch(owner, id, master.type, patch, ctx);
          },
        },
        masterNodeId
      );
    }
    return cachedTextMethods;
  };

  return new Proxy(
    { id: masterNodeId, [HFC_HANDLE_MARKER]: true as const, [HFC_HANDLE_FLAG]: true as const },
    {
      get(_t, prop) {
        throwIfAborted(ctx.signal);
        if (prop === 'id') return masterNodeId;
        if (prop === HFC_HANDLE_MARKER || prop === HFC_HANDLE_FLAG) return true;
        if (prop === 'removed') return false;
        if (prop === 'parent') return null;
        const master = ctx.lookupMasterNode(masterNodeId);
        if (!master) return undefined;
        const override = owner.overrides?.[masterNodeId];
        if (master.type === 'TEXT' && typeof prop === 'string' && TEXT_HANDLE_METHOD_KEYS.has(prop)) {
          return textMethods()[prop];
        }
        if (prop === 'type') return master.type;
        if (prop === 'name') return master.name;
        if (prop === 'set') {
          return (props: Record<string, unknown>): unknown => {
            applyOverridePatch(owner, masterNodeId, master.type, props, ctx);
            return createInstanceOverrideHandle(ctx, owner, masterNodeId);
          };
        }
        if (prop === 'clone' || prop === 'duplicate') {
          return (): unknown => {
            if (!ctx.cloneOverrideNode) {
              throw new ValidationErr(
                'VALIDATION_ERROR',
                'clone requires the node to be appended to the document'
              );
            }
            return ctx.cloneOverrideNode!(masterNodeId);
          };
        }
        if (typeof prop === 'string' && isPatchKeyForType(master.type, prop)) {
          return mergedField(master, override, prop);
        }
        if (Object.prototype.hasOwnProperty.call(master, prop as string)) {
          return master[prop as string];
        }
        return undefined;
      },
      set(_t, prop, value) {
        throwIfAborted(ctx.signal);
        const master = ctx.lookupMasterNode(masterNodeId);
        if (!master) {
          throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${masterNodeId}`);
        }
        const p = prop as string;
        if (!isPatchKeyForType(master.type, p)) {
          throw new ValidationErr('UNSUPPORTED_PROPERTY', `Unsupported patch key: ${p}`);
        }
        applyOverridePatch(owner, masterNodeId, master.type, { [p]: value }, ctx);
        return true;
      },
      has(_t, prop) {
        if (prop === 'id' || prop === HFC_HANDLE_MARKER || prop === HFC_HANDLE_FLAG) return true;
        if (prop === 'removed' || prop === 'parent') return true;
        const master = ctx.lookupMasterNode(masterNodeId);
        if (!master || typeof prop !== 'string') return false;
        if (prop === 'type' || prop === 'name' || prop === 'set' || prop === 'clone' || prop === 'duplicate') return true;
        if (master.type === 'TEXT' && TEXT_HANDLE_METHOD_KEYS.has(prop)) return true;
        return isPatchKeyForType(master.type, prop) || Object.prototype.hasOwnProperty.call(master, prop);
      },
      ownKeys() {
        const master = ctx.lookupMasterNode(masterNodeId);
        if (!master) return ['id', HFC_HANDLE_FLAG];
        const keys = new Set<string>(['id', 'type', 'name', 'set', 'clone', 'duplicate', HFC_HANDLE_FLAG]);
        const m = ENGINE_MATRIX.patchKeysByType as Record<string, Set<string> | undefined>;
        for (const k of m[master.type] ?? []) keys.add(k);
        if (master.type === 'TEXT') {
          for (const k of TEXT_HANDLE_METHOD_KEYS) keys.add(k);
        }
        return [...keys];
      },
      getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true };
      },
    }
  );
}
