import { normalizeNodeId } from '../utils.js';

function colorToHex(paint: SolidPaint): string {
  const { r, g, b } = paint.color;
  const a = paint.opacity ?? 1;
  const R = Math.round(r * 255);
  const G = Math.round(g * 255);
  const B = Math.round(b * 255);
  if (a < 1) {
    return `rgba(${R},${G},${B},${a.toFixed(3)})`;
  }
  return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
}

async function resolveVariableValue(
  variableId: string,
  modeId?: string
): Promise<string | number | boolean | null> {
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) return null;
  const resolvedMode = modeId ?? variable.valuesByMode[Object.keys(variable.valuesByMode)[0]!];
  if (resolvedMode === undefined) return null;
  if (typeof resolvedMode === 'object' && resolvedMode !== null && 'type' in resolvedMode) {
    if (resolvedMode.type === 'VARIABLE_ALIAS') {
      return resolveVariableValue(resolvedMode.id, modeId);
    }
  }
  if (variable.resolvedType === 'COLOR' && typeof resolvedMode === 'object') {
    return colorToHex(resolvedMode as SolidPaint);
  }
  return resolvedMode as string | number | boolean;
}

function collectNodes(root: BaseNode): SceneNode[] {
  const out: SceneNode[] = [];
  if ('type' in root && root.type !== 'PAGE' && root.type !== 'DOCUMENT') {
    out.push(root as SceneNode);
  }
  if ('children' in root) {
    for (const c of root.children) {
      out.push(...collectNodes(c));
    }
  }
  return out;
}

export async function runGetVariableDefs(args: {
  nodeId: string;
}): Promise<{ type: 'text'; text: string }[]> {
  const id = normalizeNodeId(args.nodeId);
  const node = await figma.getNodeByIdAsync(id);
  if (!node) throw new Error(`UNKNOWN_NODE: No node with id ${id}`);

  const defs: Record<string, string | number | boolean> = {};
  const nodes = collectNodes(node);

  for (const n of nodes) {
    if ('boundVariables' in n && n.boundVariables) {
      for (const [field, ref] of Object.entries(n.boundVariables)) {
        if (!ref || typeof ref !== 'object' || !('id' in ref)) continue;
        const variable = await figma.variables.getVariableByIdAsync(ref.id);
        if (!variable) continue;
        const val = await resolveVariableValue(ref.id);
        const key = variable.name || `${field}/${ref.id}`;
        if (val !== null && val !== undefined) {
          defs[key] = val;
        }
      }
    }
    if ('fillStyleId' in n && typeof n.fillStyleId === 'string' && n.fillStyleId) {
      const style = await figma.getStyleByIdAsync(n.fillStyleId);
      if (style) defs[`style/fill/${style.name}`] = style.name;
    }
    if ('strokeStyleId' in n && typeof n.strokeStyleId === 'string' && n.strokeStyleId) {
      const style = await figma.getStyleByIdAsync(n.strokeStyleId);
      if (style) defs[`style/stroke/${style.name}`] = style.name;
    }
    if ('textStyleId' in n && typeof n.textStyleId === 'string' && n.textStyleId) {
      const style = await figma.getStyleByIdAsync(n.textStyleId);
      if (style) defs[`style/text/${style.name}`] = style.name;
    }
  }

  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  for (const col of collections) {
    for (const vid of col.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(vid);
      if (!variable) continue;
      const val = await resolveVariableValue(vid);
      if (val !== null && val !== undefined) {
        defs[variable.name] = val;
      }
    }
  }

  return [{ type: 'text', text: JSON.stringify(defs) }];
}
