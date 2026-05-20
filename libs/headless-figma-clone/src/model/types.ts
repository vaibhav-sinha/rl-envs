/** Phase 1–7 subset of design-doc/data-model.md */

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
  spacing?: { x: number; y: number };
  horizontalAlignment?: 'START' | 'CENTER' | 'END';
  verticalAlignment?: 'START' | 'CENTER' | 'END';
}

/** Binds fill to a COLOR variable in {@link FileEnvelope.variableCollections}. */
export interface VariableColorPaint extends PaintBase {
  type: 'VARIABLE_COLOR';
  variableId: string;
}

export type Paint = SolidPaint | GradientPaint | ImagePaint | PatternPaint | VariableColorPaint;

/** Figma parity: `createFrame()` / `createAutoLayout()` default to a white fill when fills are omitted. */
export const DEFAULT_FRAME_FILLS: Paint[] = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

/** Figma default solid fill for new shapes and boolean nodes without an explicit fill (#D9D9D9). */
export const DEFAULT_SHAPE_FILLS: Paint[] = [{ type: 'SOLID', color: { r: 0.851, g: 0.851, b: 0.851 } }];

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
  /** When set, {@link valuesByMode} is ignored; resolution follows the target variable. */
  aliasOfVariableId?: string;
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

export interface EffectStyleDefinition {
  id: string;
  name: string;
  effects: Effect[];
}

export interface GridStyleDefinition {
  id: string;
  name: string;
  layoutGrids: LayoutGridColumns[];
}

/** Figma VariableBindableNodeField (subset used on frames). */
export type FrameBoundVariableField =
  | 'width'
  | 'height'
  | 'characters'
  | 'itemSpacing'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingTop'
  | 'paddingBottom'
  | 'visible'
  | 'topLeftRadius'
  | 'topRightRadius'
  | 'bottomLeftRadius'
  | 'bottomRightRadius'
  | 'minWidth'
  | 'maxWidth'
  | 'minHeight'
  | 'maxHeight'
  | 'counterAxisSpacing'
  | 'strokeWeight'
  | 'strokeTopWeight'
  | 'strokeRightWeight'
  | 'strokeBottomWeight'
  | 'strokeLeftWeight'
  | 'opacity'
  | 'gridRowGap'
  | 'gridColumnGap';

/** Figma VariableBindableTextField. */
export type TextBoundVariableField =
  | 'fontFamily'
  | 'fontSize'
  | 'fontStyle'
  | 'fontWeight'
  | 'letterSpacing'
  | 'lineHeight'
  | 'paragraphSpacing'
  | 'paragraphIndent'
  | 'characters';

export type FrameVariableBindings = Partial<Record<FrameBoundVariableField, string>> & {
  fills?: string[];
  strokes?: string[];
  effects?: string[];
  layoutGrids?: string[];
  textRangeFills?: string[];
};

export type TextVariableBindings = Partial<Record<TextBoundVariableField, string>> & {
  textRangeFills?: string[];
};

export type LineHeight =
  | { unit: 'AUTO' }
  | { unit: 'PIXELS'; value: number }
  | { unit: 'PERCENT'; value: number };

export type LetterSpacing =
  | { unit: 'PIXELS'; value: number }
  | { unit: 'PERCENT'; value: number };

export type LeadingTrim = 'NONE' | 'CAP_HEIGHT' | 'EXCLUSION';

export type TextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';

export interface TextDecoration {
  type: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  color?: RGBA;
  offset?: number;
  thickness?: number;
  style?: 'SOLID' | 'WAVY' | 'DOTTED';
  skipInk?: boolean;
}

export interface TextListOptions {
  type: 'NONE' | 'ORDERED' | 'UNORDERED';
  indent?: number;
}

export interface IndividualStrokeWeights {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type GridTrackSize =
  | { type: 'FIXED'; value: number }
  | { type: 'HUG' }
  | { type: 'FLEX'; value?: number };

export type EffectBoundVariableField = 'radius' | 'color' | 'spread' | 'offsetX' | 'offsetY';

export type EffectBoundVariables = Partial<
  Record<EffectBoundVariableField, { type: 'VARIABLE_ALIAS'; id: string }>
>;

export interface DropShadowEffect {
  type: 'DROP_SHADOW';
  visible?: boolean;
  offset: { x: number; y: number };
  radius: number;
  spread?: number;
  color: RGBA;
  blendMode: BlendMode;
  showShadowBehindNode?: boolean;
  boundVariables?: EffectBoundVariables;
}

export interface InnerShadowEffect {
  type: 'INNER_SHADOW';
  visible?: boolean;
  offset: { x: number; y: number };
  radius: number;
  spread?: number;
  color: RGBA;
  blendMode: BlendMode;
  boundVariables?: EffectBoundVariables;
}

export interface BackgroundBlurEffect {
  type: 'BACKGROUND_BLUR';
  visible?: boolean;
  /** Blur radius in CSS px. */
  radius: number;
  boundVariables?: EffectBoundVariables;
}

export interface LayerBlurEffect {
  type: 'LAYER_BLUR';
  visible?: boolean;
  radius: number;
  boundVariables?: EffectBoundVariables;
}

export interface NoiseEffect {
  type: 'NOISE';
  visible?: boolean;
  radius?: number;
  noiseSize?: number;
  density?: number;
}

export interface TextureEffect {
  type: 'TEXTURE';
  visible?: boolean;
  radius?: number;
  imageHash?: string;
}

export type Effect =
  | DropShadowEffect
  | InnerShadowEffect
  | BackgroundBlurEffect
  | LayerBlurEffect
  | NoiseEffect
  | TextureEffect;

export interface NodeBase {
  id: string;
  type: string;
  name: string;
  visible?: boolean;
  /** Original Figma node id from import (e.g. "123:456"). Used for copy-export exclusions. */
  sourceFigmaId?: string;
}

export type LayoutSizing = 'FIXED' | 'HUG' | 'FILL';
export type LayoutPositioning = 'AUTO' | 'ABSOLUTE';
export type LayoutConstraintHorizontal = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
export type LayoutConstraintVertical = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';

export interface LayoutConstraints {
  horizontal: LayoutConstraintHorizontal;
  vertical: LayoutConstraintVertical;
}

export interface FontName {
  family: string;
  style: string;
}

/** Optional auto-layout child / mask flags (Phase 4) + sizing (Phase 7). */
export interface LayoutSelfFields {
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
  layoutGrow?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  /** When true, this node defines a vector mask for following siblings until the next mask node (compile binding). */
  isMask?: boolean;
  /** SHA256 asset id for plugin-exported icon (SVG or @2x PNG). */
  iconSvgAssetHash?: string;
  /** Phase 7 — auto-layout child sizing (Figma parity subset). */
  layoutSizingHorizontal?: LayoutSizing;
  layoutSizingVertical?: LayoutSizing;
  layoutPositioning?: LayoutPositioning;
  constraints?: LayoutConstraints;
  /** Grid auto-layout child placement (layoutMode GRID on parent). */
  gridRowSpan?: number;
  gridColumnSpan?: number;
  gridRowAnchorIndex?: number;
  gridColumnAnchorIndex?: number;
  gridChildHorizontalAlign?: 'MIN' | 'CENTER' | 'MAX' | 'AUTO';
  gridChildVerticalAlign?: 'MIN' | 'CENTER' | 'MAX' | 'AUTO';
}

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';

export type LayoutGridBoundVariableField = 'count' | 'gutterSize' | 'sectionSize' | 'offset';

export type LayoutGridBoundVariables = Partial<
  Record<LayoutGridBoundVariableField, { type: 'VARIABLE_ALIAS'; id: string }>
>;

export interface LayoutGridColumns {
  type: 'COLUMNS';
  /** Number of column tracks. */
  count: number;
  /** Gap between column lines in px. */
  gutter: number;
  /** Optional RGBA 0..1 for grid line color (default light gray). */
  color?: RGBA;
  boundVariables?: LayoutGridBoundVariables;
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
  /** Canvas background (Figma `PageNode.backgrounds`). */
  backgrounds?: Paint[];
  /** Phase 7 — page divider marker (Figma `isPageDivider`). */
  isPageDivider?: boolean;
}

export interface AssetRecord {
  id: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml';
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
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  cornerSmoothing?: number;
  individualStrokeWeights?: Partial<IndividualStrokeWeights>;
  effects?: Effect[];
  clipsContent?: boolean;
  itemReverseZIndex?: boolean;
  strokesIncludedInLayout?: boolean;
  fillStyleId?: string;
  strokeStyleId?: string;
  effectStyleId?: string;
  gridStyleId?: string;
  explicitVariableModes?: Record<string, string>;
  /** Phase 4 auto layout (compile-time resolved positions on ephemeral clone). */
  layoutMode?: LayoutMode;
  gridRowCount?: number;
  gridColumnCount?: number;
  gridRowGap?: number;
  gridColumnGap?: number;
  gridRowSizes?: GridTrackSize[];
  gridColumnSizes?: GridTrackSize[];
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  /** Gap between wrapped tracks; when unset, matches itemSpacing (Figma null-sync). */
  counterAxisSpacing?: number;
  counterAxisAlignContent?: 'AUTO' | 'SPACE_BETWEEN';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  /** Visible column guides overlay (compile-only decoration). */
  layoutGrids?: LayoutGridColumns[];
  /** Phase 7 — frame axis sizing when auto-layout is active. */
  primaryAxisSizingMode?: LayoutSizing;
  counterAxisSizingMode?: LayoutSizing;
  /** Phase 8 — maps auto-layout numeric fields to FLOAT (or STRING unsupported here) variable ids. */
  boundVariables?: FrameVariableBindings;
}

export interface TextRangeStyle {
  fills?: Paint[];
  fontName?: FontName;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  textCase?: TextCase;
  textDecoration?: TextDecoration;
  hyperlink?: { type: 'URL'; url: string };
  textStyleId?: string;
  fillStyleId?: string;
  listOptions?: TextListOptions;
  openTypeFeatures?: Record<string, boolean>;
  boundVariables?: Partial<Record<TextBoundVariableField, string>>;
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
  /** Phase 7 — loaded via `figma.loadFontAsync` before edit. */
  fontName?: FontName;
  fills?: Paint[];
  effects?: Effect[];
  /** Empty or absent: entire string uses node-level style. */
  styledSegments?: StyledSegment[];
  /** References {@link FileEnvelope.textStyles} id (merged at compile time). */
  textStyleId?: string;
  /**
   * Renders characters along a sibling VECTOR path (`pathId` must match a VECTOR in the same parent).
   * @see Figma Plugin API — `TextNode.textOnPath`.
   */
  textOnPath?: { pathId: string; startOffset?: number };
  /**
   * Figma `TextNode.textAutoResize`. `HEIGHT` = fixed width, grow vertically (wrap); `TRUNCATE` is legacy.
   * @see Figma Plugin API — `TextNode.textAutoResize`.
   */
  textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE';
  /** When `ENDING`, overflowing text uses an ellipsis (see `maxLines`). */
  textTruncation?: 'DISABLED' | 'ENDING';
  /** Only applies with `textTruncation: 'ENDING'`. */
  maxLines?: number | null;
  /**
   * Figma `TextNode.textAlignHorizontal`. Omitted = Figma default `LEFT`.
   * @see Figma Plugin API — `TextNode.textAlignHorizontal`.
   */
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  /**
   * Figma `TextNode.textAlignVertical`. Omitted = Figma default `TOP`.
   * @see Figma Plugin API — `TextNode.textAlignVertical`.
   */
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  /** Node-level when uniform; per-range overrides use {@link TextNode.styledSegments}. */
  textCase?: TextCase;
  textDecoration?: TextDecoration;
  leadingTrim?: LeadingTrim;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  listSpacing?: number;
  hangingPunctuation?: boolean;
  hangingList?: boolean;
  listOptions?: TextListOptions;
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  fillStyleId?: string;
  strokeStyleId?: string;
  effectStyleId?: string;
  explicitVariableModes?: Record<string, string>;
  boundVariables?: TextVariableBindings;
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
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  cornerSmoothing?: number;
  individualStrokeWeights?: Partial<IndividualStrokeWeights>;
  effects?: Effect[];
  explicitVariableModes?: Record<string, string>;
  /** References {@link FileEnvelope.paintStyles} id (first paint merged as fill when node fills absent). */
  fillStyleId?: string;
  strokeStyleId?: string;
  /** References {@link FileEnvelope.effectStyles} id (merged at compile when `effects` is empty). */
  effectStyleId?: string;
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

/** @see Figma Plugin API — {@link https://developers.figma.com/docs/plugins/api/TransformModifier} */
export type TransformModifier =
  | {
      type: 'REPEAT';
      repeatType: 'LINEAR';
      axis: 'HORIZONTAL' | 'VERTICAL';
      count: number;
      unitType: 'RELATIVE' | 'PIXELS';
      offset: number;
    }
  | {
      type: 'REPEAT';
      repeatType: 'RADIAL';
      count: number;
      unitType: 'RELATIVE' | 'PIXELS';
      offset: number;
    };

export interface TransformGroupNode extends NodeBase, LayoutSelfFields {
  type: 'TRANSFORM_GROUP';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  /** Transform modifiers applied to children (Figma `transformModifiers`). */
  transformModifiers?: TransformModifier[];
  children: SceneNode[];
}

/** Phase 7 — `figma.group` container (compiler treats like transform group). */
export interface GroupNode extends NodeBase, LayoutSelfFields {
  type: 'GROUP';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  children: SceneNode[];
}

/** Phase 7 — export slice region. */
export interface SliceNode extends NodeBase, LayoutSelfFields {
  type: 'SLICE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
}

/** Phase 7 — named canvas section. */
export interface SectionNode extends NodeBase, LayoutSelfFields {
  type: 'SECTION';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  fills?: Paint[];
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

/**
 * Phase 9 — component graph nodes.
 *
 * Notes:
 * - We store the actual master artwork as a normal `FRAME` node (`rootFrameId`),
 *   and keep the `COMPONENT` / `COMPONENT_SET` wrappers as first-class scene nodes.
 * - Instance overrides are keyed by "stable exposed node ids" from the base variant
 *   (and may be remapped at compile-time using the component set's nodeId map).
 */
export type ComponentPropertyDefinition =
  | { type: 'BOOLEAN'; defaultValue: boolean }
  | { type: 'TEXT'; defaultValue: string }
  | { type: 'VARIANT'; variantOptions: string[]; defaultValue: string }
  | { type: 'INSTANCE_SWAP'; preferredValues?: string[] };

export type ComponentPropertyValue =
  | { type: 'BOOLEAN'; value: boolean }
  | { type: 'TEXT'; value: string }
  | { type: 'VARIANT'; value: string }
  | { type: 'INSTANCE_SWAP'; value: string };

export interface ComponentNode extends NodeBase, LayoutSelfFields {
  type: 'COMPONENT';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  /** Frame node id containing the master artwork. */
  rootFrameId: string;
  /** Figma published key for `importComponentByKeyAsync` (local components only). */
  componentKey?: string;
  componentPropertyDefinitions?: Record<string, ComponentPropertyDefinition>;
}

export interface ComponentSetNode extends NodeBase, LayoutSelfFields {
  type: 'COMPONENT_SET';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  /** Figma published key for `importComponentSetByKeyAsync` (local sets only). */
  componentKey?: string;
  /** Ordered variant component ids. */
  componentIds: string[];
  /** Component set "variant property" key. We implement a minimal subset. */
  variantPropertyKey?: string;
  /** Values are parallel to `componentIds` (used for instance.variantProperties/componentProperties). */
  variantOptions?: string[];
  /**
   * For override preservation across variants:
   * - stable ids are from the base component variant (componentIds[0])
   * - maps stableId -> variantNodeId inside the corresponding component's root frame.
   */
  nodeIdMapByComponentId?: Record<string, Record<string, string>>;
  baseComponentId?: string;
}

export interface InstanceNode extends NodeBase, LayoutSelfFields {
  type: 'INSTANCE';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  blendMode?: BlendMode;
  mainComponentId: string;
  /** Detached instance subtree from Figma plugin export when `mainComponent` is unresolved. */
  children?: SceneNode[];
  /**
   * Phase 9 — variant selection (minimal subset).
   * Example shape: { variant: { type: 'VARIANT', value: 'Small' } }
   */
  componentProperties?: Record<string, ComponentPropertyValue>;
  /**
   * Keys are stable exposed node ids from the base variant of the component set.
   * Compile-time remapping may occur for the selected variant.
   */
  overrides?: Record<string, ComponentOverrideFields>;
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
  | GroupNode
  | SliceNode
  | SectionNode
  | TableNode
  | ComponentInstanceNode
  | ComponentNode
  | ComponentSetNode
  | InstanceNode;

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
  /** Phase 8 — local effect styles (reorder via engine ops). */
  effectStyles?: EffectStyleDefinition[];
  /** Phase 8 — local layout grid styles. */
  gridStyles?: GridStyleDefinition[];
  /** Phase 5 legacy component masters (migrated to graph nodes in Phase 9). */
  components?: ComponentDefinition[];
}
