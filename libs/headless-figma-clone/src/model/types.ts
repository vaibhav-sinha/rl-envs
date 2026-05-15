/** Phase 1–5 subset of design-doc/data-model.md */

export type SchemaVersion = number;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a?: number;
}

export type BlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'MULTIPLY'
  | 'SCREEN'
  | 'OVERLAY'
  | 'DARKEN'
  | 'LIGHTEN'
  | 'COLOR_DODGE'
  | 'COLOR_BURN'
  | 'HARD_LIGHT'
  | 'SOFT_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

export type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL';
export type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND';

export interface PaintBase {
  visible?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
}

export interface SolidPaint extends PaintBase {
  type: 'SOLID';
  color: RGB;
}

export interface GradientStop {
  position: number;
  color: RGBA;
}

export interface GradientPaint extends PaintBase {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  /** 2×3 affine row-major subset; compiler uses approximate mapping. */
  gradientTransform: [[number, number, number], [number, number, number]];
  gradientStops: GradientStop[];
}

export interface ImagePaint extends PaintBase {
  type: 'IMAGE';
  /** Registry key: must match `AssetRecord.sha256` for active file. */
  imageHash: string;
  scaleMode: 'FILL' | 'FIT' | 'TILE' | 'STRETCH';
}

export interface PatternPaint extends PaintBase {
  type: 'PATTERN';
  sourceNodeId: string;
  tileType: 'RECTANGULAR';
  scalingFactor: number;
}

/** Binds fill to a COLOR variable in {@link FileEnvelope.variableCollections}. */
export interface VariableColorPaint extends PaintBase {
  type: 'VARIABLE_COLOR';
  variableId: string;
}

export type Paint = SolidPaint | GradientPaint | ImagePaint | PatternPaint | VariableColorPaint;

export interface VariableMode {
  id: string;
  name: string;
}

export type VariableResolvedValue =
  | { type: 'COLOR'; color: RGB }
  | { type: 'FLOAT'; value: number }
  | { type: 'STRING'; value: string };

export interface VariableDefinition {
  id: string;
  name: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING';
  valuesByMode: Record<string, VariableResolvedValue>;
}

export interface VariableCollection {
  id: string;
  name: string;
  defaultModeId: string;
  modes: VariableMode[];
  variables: VariableDefinition[];
}

export interface TextStyleDefinition {
  id: string;
  name: string;
  fontSize?: number;
  fontWeight?: number;
  fills?: Paint[];
}

export interface PaintStyleDefinition {
  id: string;
  name: string;
  paints: Paint[];
}

export interface DropShadowEffect {
  type: 'DROP_SHADOW';
  visible?: boolean;
  offset: { x: number; y: number };
  radius?: number;
  spread?: number;
  color?: RGBA;
}

export interface BackdropBlurEffect {
  type: 'BACKDROP_BLUR';
  visible?: boolean;
  /** Blur radius in CSS px. */
  radius: number;
}

export type Effect = DropShadowEffect | BackdropBlurEffect;

export interface NodeBase {
  id: string;
  type: string;
  name: string;
  visible?: boolean;
}

/** Optional auto-layout child / mask flags (Phase 4). */
export interface LayoutSelfFields {
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
  layoutGrow?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  /** When true, this node defines a vector mask for following siblings until the next mask node (compile binding). */
  isMask?: boolean;
}

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

export interface LayoutGridColumns {
  type: 'COLUMNS';
  /** Number of column tracks. */
  count: number;
  /** Gap between column lines in px. */
  gutter: number;
  /** Optional RGBA 0..1 for grid line color (default light gray). */
  color?: RGBA;
}

export interface DocumentNode extends NodeBase {
  type: 'DOCUMENT';
  children: PageNode[];
}

export interface PageNode extends NodeBase {
  type: 'PAGE';
  children: SceneNode[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface AssetRecord {
  id: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  byteLength: number;
  sha256: string;
  /** Relative to the `.hfc.json` directory (e.g. `MyFile.hfc.assets/abc.png`). */
  relativePath: string;
}

export interface AssetRegistry {
  byId: Record<string, AssetRecord>;
}

export interface FrameNode extends NodeBase, LayoutSelfFields {
  type: 'FRAME';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  children: SceneNode[];
  fills?: Paint[];
  /** Renders behind fills (Phase 2). */
  backgrounds?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  effects?: Effect[];
  clipsContent?: boolean;
  /** Phase 4 auto layout (compile-time resolved positions on ephemeral clone). */
  layoutMode?: LayoutMode;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'BASELINE';
  /** Visible column guides overlay (compile-only decoration). */
  layoutGrids?: LayoutGridColumns[];
}

export interface TextRangeStyle {
  fills?: Paint[];
  fontSize?: number;
  fontWeight?: number;
  hyperlink?: { type: 'URL'; url: string };
}

export interface StyledSegment {
  start: number;
  end: number;
  style: TextRangeStyle;
}

export interface TextNode extends NodeBase, LayoutSelfFields {
  type: 'TEXT';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  characters: string;
  fontSize?: number;
  fontWeight?: number;
  fills?: Paint[];
  effects?: Effect[];
  /** Empty or absent: entire string uses node-level style. */
  styledSegments?: StyledSegment[];
  /** References {@link FileEnvelope.textStyles} id (merged at compile time). */
  textStyleId?: string;
  /**
   * Renders characters along a sibling VECTOR path (`pathNodeId` must match a VECTOR in the same FRAME).
   * @see design-doc Phase 5 — text path binding.
   */
  textOnPath?: { pathNodeId: string };
}

export interface RectangleNode extends NodeBase, LayoutSelfFields {
  type: 'RECTANGLE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  cornerRadius?: number;
  effects?: Effect[];
  /** References {@link FileEnvelope.paintStyles} id (first paint merged as fill when node fills absent). */
  fillStyleId?: string;
}

export interface EllipseNode extends NodeBase, LayoutSelfFields {
  type: 'ELLIPSE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  effects?: Effect[];
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number };
}

export interface LineNode extends NodeBase, LayoutSelfFields {
  type: 'LINE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  strokes: Paint[];
  strokeWeight: number;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  dashPattern?: number[];
  effects?: Effect[];
}

export interface PolygonNode extends NodeBase, LayoutSelfFields {
  type: 'POLYGON';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  /** Integer ≥ 3 (Figma PolygonNode). */
  pointCount: number;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  effects?: Effect[];
}

export interface StarNode extends NodeBase, LayoutSelfFields {
  type: 'STAR';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  pointCount: number;
  /** 0..1 inclusive (Figma StarNode.innerRadius). */
  innerRadius: number;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  effects?: Effect[];
}

export interface VectorPathData {
  windingRule: 'NONZERO' | 'EVENODD';
  /** SVG path `d` in local coordinates (0,0)–(width,height). */
  data: string;
}

export interface VectorNode extends NodeBase, LayoutSelfFields {
  type: 'VECTOR';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  vectorPaths: VectorPathData[];
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  effects?: Effect[];
}

export type BooleanOperandNode = RectangleNode | EllipseNode | PolygonNode | StarNode | VectorNode;

export interface BooleanOperationNode extends NodeBase, LayoutSelfFields {
  type: 'BOOLEAN_OPERATION';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  booleanOperation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';
  /** Operand subtree (Phase 4: shapes only, ≥2 children). */
  children: BooleanOperandNode[];
  fills?: Paint[];
  effects?: Effect[];
}

export interface TransformGroupNode extends NodeBase, LayoutSelfFields {
  type: 'TRANSFORM_GROUP';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  children: SceneNode[];
}

export interface TableCell {
  text: string;
  fills?: Paint[];
}

export interface TableNode extends NodeBase, LayoutSelfFields {
  type: 'TABLE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  columnCount: number;
  rowCount: number;
  columnWidths: number[];
  rowHeights: number[];
  /** Row-major length `rowCount * columnCount`. */
  cells: TableCell[];
}

export type ComponentOverrideFields = {
  fills?: Paint[];
  characters?: string;
  fontSize?: number;
  fontWeight?: number;
};

export interface ComponentInstanceNode extends NodeBase, LayoutSelfFields {
  type: 'COMPONENT_INSTANCE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  mainComponentId: string;
  /** Keys are node ids inside {@link ComponentDefinition.root}. */
  overrides?: Record<string, ComponentOverrideFields>;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  /** Root frame of the component master (stable ids for {@link ComponentInstanceNode.overrides}). */
  root: FrameNode;
}

export type SceneNode =
  | FrameNode
  | TextNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | StarNode
  | VectorNode
  | BooleanOperationNode
  | TransformGroupNode
  | TableNode
  | ComponentInstanceNode;

export type AnyTreeNode = DocumentNode | PageNode | SceneNode;

export interface FileEnvelope {
  schemaVersion: SchemaVersion;
  fileKey: string;
  fileName: string;
  nextInternalId: number;
  document: DocumentNode;
  assets?: AssetRegistry;
  /** Phase 5 — design tokens (COLOR/FLOAT/STRING) grouped by collection + mode. */
  variableCollections?: VariableCollection[];
  /** Optional per-collection active mode id (defaults to each collection's `defaultModeId`). */
  activeModeByCollectionId?: Record<string, string>;
  textStyles?: TextStyleDefinition[];
  paintStyles?: PaintStyleDefinition[];
  components?: ComponentDefinition[];
}
