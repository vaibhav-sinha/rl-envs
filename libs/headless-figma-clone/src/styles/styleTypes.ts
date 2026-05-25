export const FIGMA_STYLE_TYPE = {
  paint: 'PAINT',
  text: 'TEXT',
  effect: 'EFFECT',
  grid: 'GRID',
} as const;

export type StyleRoute = keyof typeof FIGMA_STYLE_TYPE;
export type FigmaStyleType = (typeof FIGMA_STYLE_TYPE)[StyleRoute];

export type InheritedStyleField =
  | 'fillStyleId'
  | 'strokeStyleId'
  | 'textStyleId'
  | 'effectStyleId'
  | 'gridStyleId';
