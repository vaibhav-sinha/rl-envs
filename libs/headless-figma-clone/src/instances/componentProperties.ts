/**
 * Shared component property merge/apply (Figma InstanceNode.setProperties parity).
 */
import type {
  ComponentPropertyValue,
  ComponentSetNode,
  FrameNode,
  InstanceNode,
  SceneNode,
} from '../model/types.js';

export function componentPropertyDefinitionKeys(
  definitions: Record<string, unknown> | undefined
): string[] {
  return definitions ? Object.keys(definitions) : [];
}

export function componentPropertyLabel(key: string): string {
  const i = key.indexOf('#');
  return (i >= 0 ? key.slice(0, i) : key).trim();
}

function hasPropertySuffix(key: string): boolean {
  return key.includes('#');
}

function collectSceneNodes(root: SceneNode): SceneNode[] {
  const out: SceneNode[] = [];
  const stack: SceneNode[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n);
    if (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP' || n.type === 'SECTION') {
      for (const ch of n.children) stack.push(ch);
    } else if (n.type === 'BOOLEAN_OPERATION') {
      for (const ch of n.children as unknown as SceneNode[]) stack.push(ch);
    } else if (n.type === 'INSTANCE' && n.children?.length) {
      for (const ch of n.children) stack.push(ch);
    }
  }
  return out;
}

export function componentPropertyValuesByName(
  props: Record<string, ComponentPropertyValue>
): Map<string, ComponentPropertyValue> {
  const byName = new Map<string, ComponentPropertyValue>();
  for (const [key, val] of Object.entries(props)) {
    byName.set(key, val);
    byName.set(componentPropertyLabel(key), val);
  }
  return byName;
}

/** Resolve VARIANT value from instance properties (Figma uses suffixed keys like `Size#0:1`). */
export function resolveVariantPropertyValue(
  componentProperties: Record<string, ComponentPropertyValue> | undefined,
  set: ComponentSetNode
): string | undefined {
  const key = set.variantPropertyKey ?? 'variant';
  const direct = componentProperties?.[key];
  if (direct?.type === 'VARIANT') return direct.value;
  for (const [k, val] of Object.entries(componentProperties ?? {})) {
    if (val.type === 'VARIANT' && (k === key || componentPropertyLabel(k) === componentPropertyLabel(key))) {
      return val.value;
    }
  }
  for (const val of Object.values(componentProperties ?? {})) {
    if (val.type === 'VARIANT') return val.value;
  }
  return set.variantOptions?.[0];
}

/**
 * Map user-facing property name (e.g. `Text`) to stored key (`Text#2613:0`).
 */
export function resolveCanonicalPropertyKey(
  current: Record<string, ComponentPropertyValue> | undefined,
  inputKey: string,
  definitionKeys?: string[]
): string {
  if (current?.[inputKey]) return inputKey;

  const label = componentPropertyLabel(inputKey);
  const matches = Object.keys(current ?? {}).filter(
    (k) => componentPropertyLabel(k) === label
  );

  if (matches.length === 1) return matches[0]!;

  if (matches.length > 1) {
    const variantMatches = matches.filter((k) => current![k]?.type === 'VARIANT');
    if (variantMatches.length === 1) return variantMatches[0]!;
    const suffixed = matches.filter(hasPropertySuffix);
    if (suffixed.length === 1) return suffixed[0]!;
    if (suffixed.length > 1) return suffixed[0]!;
    return matches[0]!;
  }

  const defMatches = (definitionKeys ?? []).filter((k) => componentPropertyLabel(k) === label);
  if (defMatches.length === 1) return defMatches[0]!;
  if (defMatches.length > 1) {
    const suffixed = defMatches.filter(hasPropertySuffix);
    if (suffixed.length === 1) return suffixed[0]!;
    return defMatches[0]!;
  }

  return inputKey;
}

function mergeOnePropertyValue(
  existing: ComponentPropertyValue | undefined,
  raw: string | boolean
): ComponentPropertyValue {
  if (existing?.type === 'VARIANT') {
    return { type: 'VARIANT', value: String(raw) };
  }
  if (existing?.type === 'BOOLEAN' || typeof raw === 'boolean') {
    return { type: 'BOOLEAN', value: Boolean(raw) };
  }
  if (existing?.type === 'INSTANCE_SWAP') {
    return { type: 'INSTANCE_SWAP', value: String(raw) };
  }
  return { type: 'TEXT', value: String(raw) };
}

/** Remove duplicate keys that share a label when a suffixed canonical key exists. */
function pruneDuplicatePropertyKeys(
  props: Record<string, ComponentPropertyValue>
): void {
  const byLabel = new Map<string, string[]>();
  for (const key of Object.keys(props)) {
    const label = componentPropertyLabel(key);
    const list = byLabel.get(label) ?? [];
    list.push(key);
    byLabel.set(label, list);
  }
  for (const keys of byLabel.values()) {
    if (keys.length < 2) continue;
    const suffixed = keys.filter(hasPropertySuffix);
    if (suffixed.length === 0) continue;
    const canonical = suffixed[0]!;
    for (const key of keys) {
      if (key !== canonical && !hasPropertySuffix(key)) {
        delete props[key];
      }
    }
  }
}

export function mergeComponentPropertyValues(
  current: Record<string, ComponentPropertyValue> | undefined,
  values: Record<string, string | boolean>,
  definitionKeys?: string[]
): Record<string, ComponentPropertyValue> {
  const next: Record<string, ComponentPropertyValue> = { ...(current ?? {}) };
  for (const [inputKey, raw] of Object.entries(values)) {
    const key = resolveCanonicalPropertyKey(current ?? next, inputKey, definitionKeys);
    next[key] = mergeOnePropertyValue(current?.[key] ?? next[key], raw);
  }
  pruneDuplicatePropertyKeys(next);
  return next;
}

export function applyComponentPropertyToNodeField(
  node: SceneNode,
  field: string,
  val: ComponentPropertyValue
): void {
  if (val.type === 'BOOLEAN' && field === 'visible') {
    node.visible = val.value;
    return;
  }
  if (val.type === 'TEXT' && node.type === 'TEXT') {
    if (field === 'characters') {
      node.characters = val.value;
      return;
    }
    if (field === 'fontSize') {
      const n = Number(val.value);
      if (!Number.isNaN(n)) node.fontSize = n;
      return;
    }
    if (field === 'textAlignHorizontal') {
      const v = val.value;
      if (v === 'LEFT' || v === 'CENTER' || v === 'RIGHT' || v === 'JUSTIFIED') {
        node.textAlignHorizontal = v;
      }
      return;
    }
  }
  if (val.type === 'INSTANCE_SWAP' && field === 'mainComponent' && node.type === 'INSTANCE') {
    node.mainComponentId = val.value;
    return;
  }
}

/**
 * Apply instance `componentProperties` via `componentPropertyReferences` on layers.
 * VARIANT selection is handled separately when resolving the component root.
 */
export function applyComponentProperties(
  root: FrameNode,
  props?: Record<string, ComponentPropertyValue>
): void {
  if (!props) return;
  const byName = componentPropertyValuesByName(props);
  for (const node of collectSceneNodes(root)) {
    const refs = node.componentPropertyReferences;
    if (!refs) continue;
    for (const [field, propName] of Object.entries(refs)) {
      const val = byName.get(propName) ?? byName.get(componentPropertyLabel(propName));
      if (val) applyComponentPropertyToNodeField(node, field, val);
    }
  }
}

/** Apply merged properties to all detached roots on an instance (FRAME subtrees or direct layers). */
export function applyComponentPropertiesToInstanceChildren(
  inst: Pick<InstanceNode, 'children'>,
  props: Record<string, ComponentPropertyValue> | undefined
): void {
  if (!props || !inst.children?.length) return;
  const byName = componentPropertyValuesByName(props);
  const textProps = Object.values(props).filter((v) => v.type === 'TEXT');
  for (const child of inst.children) {
    if (child.type === 'FRAME') {
      applyComponentProperties(child, props);
      applyComponentPropertiesTextFallback(child, props);
      continue;
    }
    const refs = child.componentPropertyReferences;
    if (refs) {
      for (const [field, propName] of Object.entries(refs)) {
        const val = byName.get(propName) ?? byName.get(componentPropertyLabel(propName));
        if (val) applyComponentPropertyToNodeField(child, field, val);
      }
    }
    if (
      child.type === 'TEXT' &&
      textProps.length === 1 &&
      !child.componentPropertyReferences?.characters
    ) {
      applyComponentPropertyToNodeField(child, 'characters', textProps[0]!);
    }
  }
}

/** Script-built components may lack `componentPropertyReferences`; bind lone TEXT layers. */
function applyComponentPropertiesTextFallback(
  root: FrameNode,
  props: Record<string, ComponentPropertyValue>
): void {
  const textProps = Object.values(props).filter((v) => v.type === 'TEXT');
  if (textProps.length !== 1) return;
  const val = textProps[0]!;
  const textNodes = collectSceneNodes(root).filter((n) => n.type === 'TEXT');
  if (textNodes.length !== 1) return;
  const t = textNodes[0]!;
  if (t.componentPropertyReferences?.characters) return;
  applyComponentPropertyToNodeField(t, 'characters', val);
}
