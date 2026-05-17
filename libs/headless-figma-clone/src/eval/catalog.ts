import type { FileEnvelope, RGB } from '../model/types.js';

export interface DesignCatalog {
  componentIds: Set<string>;
  textStyleIds: Set<string>;
  paintStyleIds: Set<string>;
  colors: RGB[];
  fontSizes: number[];
  hasTextStyles: boolean;
  hasVariables: boolean;
  hasComponents: boolean;
}

function collectSolidColors(envelope: FileEnvelope): RGB[] {
  const colors: RGB[] = [];
  const seen = new Set<string>();
  const add = (c: RGB) => {
    const key = `${c.r},${c.g},${c.b}`;
    if (!seen.has(key)) {
      seen.add(key);
      colors.push(c);
    }
  };
  for (const ts of envelope.textStyles ?? []) {
    for (const f of ts.fills ?? []) {
      if (f.type === 'SOLID') add(f.color);
    }
  }
  for (const ps of envelope.paintStyles ?? []) {
    for (const f of ps.paints ?? []) {
      if (f.type === 'SOLID') add(f.color);
    }
  }
  return colors;
}

function collectFontSizes(envelope: FileEnvelope): number[] {
  const sizes = new Set<number>();
  for (const ts of envelope.textStyles ?? []) {
    if (typeof ts.fontSize === 'number') sizes.add(ts.fontSize);
  }
  return [...sizes];
}

export function buildCatalog(envelope: FileEnvelope): DesignCatalog {
  const componentIds = new Set((envelope.components ?? []).map((c) => c.id));
  const textStyleIds = new Set((envelope.textStyles ?? []).map((t) => t.id));
  const paintStyleIds = new Set((envelope.paintStyles ?? []).map((p) => p.id));

  return {
    componentIds,
    textStyleIds,
    paintStyleIds,
    colors: collectSolidColors(envelope),
    fontSizes: collectFontSizes(envelope),
    hasTextStyles: textStyleIds.size > 0,
    hasVariables: (envelope.variableCollections ?? []).length > 0,
    hasComponents: componentIds.size > 0,
  };
}

export function componentExists(catalog: DesignCatalog, componentId: string): boolean {
  return catalog.componentIds.has(componentId);
}
