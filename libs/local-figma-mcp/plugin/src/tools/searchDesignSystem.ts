
type HitKind = 'component' | 'variable' | 'paintStyle' | 'textStyle' | 'effectStyle';

interface Hit {
  kind: HitKind;
  name: string;
  id: string;
  key?: string;
  libraryKey?: string;
  score: number;
}

function scoreName(name: string, qLower: string): number {
  const n = name.toLowerCase();
  if (qLower === '') return 1;
  if (n === qLower) return 1_000_000;
  if (n.startsWith(qLower)) return 800_000 + qLower.length * 100;
  const idx = n.indexOf(qLower);
  if (idx < 0) return 0;
  return 500_000 + qLower.length * 100 - idx;
}

export async function runSearchDesignSystem(args: {
  query: string;
  includeComponents?: boolean;
  includeVariables?: boolean;
  includeStyles?: boolean;
  includeLibraryKeys?: string[];
}): Promise<{ type: 'text'; text: string }[]> {
  const qLower = args.query.trim().toLowerCase();
  const includeComponents = args.includeComponents !== false;
  const includeVariables = args.includeVariables !== false;
  const includeStyles = args.includeStyles !== false;
  const libraryFilter = args.includeLibraryKeys?.length
    ? new Set(args.includeLibraryKeys)
    : null;

  const hits: Hit[] = [];

  if (includeVariables) {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    for (const col of collections) {
      for (const vid of col.variableIds) {
        const v = await figma.variables.getVariableByIdAsync(vid);
        if (!v) continue;
        const sc = scoreName(v.name, qLower);
        if (sc <= 0 && qLower !== '') continue;
        hits.push({ kind: 'variable', name: v.name, id: v.id, score: sc });
      }
    }
    try {
      const libCols = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      for (const libCol of libCols) {
        if (libraryFilter && !libraryFilter.has(libCol.libraryKey)) continue;
        const vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(libCol.key);
        for (const v of vars) {
          const sc = scoreName(v.name, qLower);
          if (sc <= 0 && qLower !== '') continue;
          hits.push({
            kind: 'variable',
            name: v.name,
            id: v.key,
            key: v.key,
            libraryKey: libCol.libraryKey,
            score: sc,
          });
        }
      }
    } catch {
      /* teamlibrary unavailable */
    }
  }

  if (includeStyles) {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    for (const s of paintStyles) {
      const sc = scoreName(s.name, qLower);
      if (sc <= 0 && qLower !== '') continue;
      hits.push({ kind: 'paintStyle', name: s.name, id: s.id, score: sc });
    }
    const textStyles = await figma.getLocalTextStylesAsync();
    for (const s of textStyles) {
      const sc = scoreName(s.name, qLower);
      if (sc <= 0 && qLower !== '') continue;
      hits.push({ kind: 'textStyle', name: s.name, id: s.id, score: sc });
    }
    const effectStyles = await figma.getLocalEffectStylesAsync();
    for (const s of effectStyles) {
      const sc = scoreName(s.name, qLower);
      if (sc <= 0 && qLower !== '') continue;
      hits.push({ kind: 'effectStyle', name: s.name, id: s.id, score: sc });
    }
  }

  if (includeComponents) {
    const components = figma.root.findAll((n) => n.type === 'COMPONENT' || n.type === 'COMPONENT_SET');
    for (const c of components) {
      const sc = scoreName(c.name, qLower);
      if (sc <= 0 && qLower !== '') continue;
      hits.push({ kind: 'component', name: c.name, id: c.id, score: sc });
    }
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return [
    {
      type: 'text',
      text: JSON.stringify({ hits: hits.slice(0, 50) }),
    },
  ];
}
