# Data model (TypeScript types)

[← Design index](./index.md) · [PRD document model](../prd/document-model.md)

This document is the **canonical type system** for persisted JSON and in-memory nodes. Field names **mirror Figma Plugin API** names where noted.

## File envelope

```typescript
export type SchemaVersion = number; // integer >= 1

export interface FileEnvelope {
  schemaVersion: SchemaVersion;     // breaking change increments
  fileKey: string;                  // ULID, assigned at creation
  fileName: string;                   // human title
  nextInternalId: number;            // starts at 1; increments per allocated node id
  document: DocumentNode;
  /** Phase 5+: variable collections, modes, styles registries */
  variableCollections?: VariableCollection[];
  modes?: Mode[];
  variables?: Variable[];
  styles?: StyleRegistry;
  assets?: AssetRegistry;           // Phase 3+: keyed asset blobs metadata
}

export interface AssetRegistry {
  byId: Record<string, AssetRecord>;
}

export interface AssetRecord {
  id: string;                        // equals key in byId
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  byteLength: number;
  sha256: string;                    // hex lowercase
  relativePath: string;              // relative to file on disk, e.g. "assets/a1b2....webp"
}
```

## Node union

```typescript
export type SceneNode =
  | FrameNode
  | TextNode
  | GroupNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | StarNode
  | ShapeWithTextNode
  | SectionNode
  | SliceNode
  | HighlightNode
  | BooleanOperationNode
  | VectorNode
  | TransformGroupNode
  | ComponentNode
  | ComponentSetNode
  | InstanceNode
  | SlotNode
  | TableNode
  | TableCellNode
  | TextPathNode;

export type BaseNode = DocumentNode | PageNode | SceneNode;

export interface NodeBase {
  id: string;                        // pattern ^I[0-9]+$
  type: NodeType;
  name: string;
  visible?: boolean;                 // default true when absent (Phase 2+)
  locked?: boolean;                  // Phase 3+
}

export type NodeType =
  | 'DOCUMENT'
  | 'PAGE'
  | 'FRAME'
  | 'TEXT'
  | 'GROUP'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'POLYGON'
  | 'STAR'
  | 'SHAPE_WITH_TEXT'
  | 'SECTION'
  | 'SLICE'
  | 'HIGHLIGHT'
  | 'BOOLEAN_OPERATION'
  | 'VECTOR'
  | 'TRANSFORM_GROUP'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'SLOT'
  | 'TABLE'
  | 'TABLE_CELL'
  | 'TEXT_PATH';
```

## Geometry and transform (scene nodes)

```typescript
export interface SceneGeometry {
  x: number;
  y: number;
  width: number;                     // must be >= 0
  height: number;                    // must be >= 0
  rotation?: number;                 // degrees, default 0 (Phase 2+)
  /** Phase 4+ 2x3 affine relative to parent when not expressible as rotation-only */
  relativeTransform?: [[number, number, number], [number, number, number]];
  opacity?: number;                  // 0..1 (Phase 2+)
  blendMode?: BlendMode;             // Phase 2 node-level; Phase 3 full usage
  /** Read model: may be stored or derived; screenshot uses derived if absent */
  absoluteBoundingBox?: Rect;
  absoluteRenderBounds?: Rect;
  constrainProportions?: boolean;    // Phase 4+
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## Document / page

```typescript
export interface DocumentNode extends NodeBase {
  type: 'DOCUMENT';
  children: PageNode[];             // >= 1 page required after creation
}

export interface PageNode extends NodeBase {
  type: 'PAGE';
  children: SceneNode[];
  guides?: Guide[];                  // Phase 4+
}

export interface Guide {
  axis: 'X' | 'Y';
  offset: number;                    // position in page space
}
```

## FRAME

```typescript
export interface FrameNode extends NodeBase, SceneGeometry {
  type: 'FRAME';
  children: SceneNode[];
  fills?: Paint[];
  backgrounds?: Paint[];           // Phase 2+
  strokes?: Paint[];
  strokeWeight?: number;
  /** Phase 3+ detailed stroke fields */
  strokeAlign?: StrokeAlign;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  individualStrokeWeights?: Partial<{
    top: number; right: number; bottom: number; left: number;
  }>;
  complexStrokeProperties?: unknown; // Phase 3 subset per PRD
  effects?: Effect[];
  cornerRadius?: number;             // uniform Phase 2
  topLeftRadius?: number;            // Phase 3 per-corner
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  cornerSmoothing?: number;          // Phase 3, 0..1 typical
  clipsContent?: boolean;            // Phase 2, default false
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'; // Phase 4 auto layout
  /** ... additional auto layout fields Phase 4 — see Appendix A */
  layoutGrids?: LayoutGrid[];       // Phase 4+
  isMask?: boolean;                 // Phase 4+
  maskType?: 'ALPHA' | 'VECTOR' | 'LUMINANCE';
  boundVariables?: BoundVariables;   // Phase 5
  explicitVariableModes?: Record<string, string>; // collectionId -> modeId
}
```

**Appendix A (Phase 4 frame layout fields — normative list):** mirror PRD [document-model Phase 4](../prd/document-model.md): `primaryAxisSizingMode`, `counterAxisSizingMode`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `itemSpacing`, `layoutWrap`, `counterAxisSpacing`, `counterAxisAlignContent`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, child fields on scene children: `layoutAlign`, `layoutGrow`, `layoutSizingHorizontal`, `layoutSizingVertical`, `layoutPositioning`, grid child fields per PRD.

## TEXT

```typescript
export interface TextNode extends NodeBase, SceneGeometry {
  type: 'TEXT';
  characters: string;
  fontName?: FontName;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textAutoResize?: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE';
  textTruncation?: 'DISABLED' | 'ENDING';
  leadingTrim?: 'NONE' | 'CAP_HEIGHT' | 'EXCLUSION';
  paragraphSpacing?: number;
  hangingPunctuation?: boolean;
  hangingList?: boolean;
  fills?: Paint[];                   // default text fill
  strokes?: Paint[];
  strokeWeight?: number;
  effects?: Effect[];
  /** Styled ranges: empty => all characters use node-level style */
  styledSegments: StyledSegment[];
  listOptions?: ListOptions;        // Phase 3
  textStyleId?: string;             // Phase 5 local style id
}

export interface StyledSegment {
  start: number;                     // inclusive code unit index (UTF-16 index **binding:** use JS string UTF-16 indices to match `characters.length`)
  end: number;                       // exclusive
  style: TextRangeStyle;
}

export interface TextRangeStyle {
  fills?: Paint[];
  fontName?: FontName;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
  textDecoration?: TextDecoration;
  hyperlink?: { type: 'URL'; url: string };
  openTypeFeatures?: Record<string, number>; // Phase 3
  textStyleId?: string;             // Phase 5
}

export interface FontName {
  family: string;
  style: string;
}

export type LineHeight =
  | { unit: 'AUTO' }
  | { unit: 'PIXELS'; value: number }
  | { unit: 'PERCENT'; value: number };

export type LetterSpacing =
  | { unit: 'PIXELS'; value: number }
  | { unit: 'PERCENT'; value: number };

export interface TextDecoration {
  type: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  color?: RGBA;
  offset?: number;
  thickness?: number;
  style?: 'SOLID' | 'WAVY' | 'DOTTED';
  skipInk?: boolean;
}

export interface ListOptions {
  // Phase 3: bullet/numbered metadata per paragraph — structure matches engine tests in Phase 3 fixtures
  mode: 'NONE' | 'ORDERED' | 'UNORDERED';
  indent?: number;
  spacing?: number;
}
```

## GROUP and shapes (Phase 3 types abbreviated)

```typescript
export interface GroupNode extends NodeBase, SceneGeometry {
  type: 'GROUP';
  children: SceneNode[];
  /** GROUP has no fills in Figma; omit fills */
}

export interface RectangleNode extends NodeBase, SceneGeometry {
  type: 'RECTANGLE';
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  cornerSmoothing?: number;
  effects?: Effect[];
}

export interface EllipseNode extends NodeBase, SceneGeometry {
  type: 'ELLIPSE';
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number };
  effects?: Effect[];
}

export interface LineNode extends NodeBase, SceneGeometry {
  type: 'LINE';
  strokes: Paint[];                // at least one stroke required
  strokeWeight: number;
}

/** Additional shape nodes: POLYGON, STAR, SHAPE_WITH_TEXT, SECTION, SLICE, HIGHLIGHT
 *  carry fills/strokes/children per PRD; exact fields implemented in Phase 3 milestone.
 */
```

## VECTOR / BOOLEAN / TRANSFORM_GROUP (Phase 4)

```typescript
export interface VectorNetwork {
  vertices: { x: number; y: number; strokeCap?: StrokeCap; strokeJoin?: StrokeJoin }[];
  segments: { start: number; tangentStart?: { x: number; y: number }; end: number; tangentEnd?: { x: number; y: number } }[];
  regions?: { windingRule: 'NONZERO' | 'EVENODD'; loopIndex: number[] }[];
}

export interface VectorNode extends NodeBase, SceneGeometry {
  type: 'VECTOR';
  vectorNetwork?: VectorNetwork;
  /** Alternative: precomputed SVG path d string for tests */
  svgPath?: string;
  fills?: Paint[];
  strokes?: Paint[];
  effects?: Effect[];
}

export type BooleanOp = 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';

export interface BooleanOperationNode extends NodeBase, SceneGeometry {
  type: 'BOOLEAN_OPERATION';
  booleanOperation: BooleanOp;
  children: SceneNode[];
  fills?: Paint[];
  strokes?: Paint[];
}

export interface TransformGroupNode extends NodeBase, SceneGeometry {
  type: 'TRANSFORM_GROUP';
  children: SceneNode[];
}
```

## Components (Phase 5 sketch)

```typescript
export interface ComponentNode extends NodeBase, SceneGeometry {
  type: 'COMPONENT';
  children: SceneNode[];
  description?: string;
  descriptionMarkdown?: string;
  documentationLinks?: { label: string; url: string }[];
  /** variant properties for COMPONENT_SET children */
  componentPropertyDefinitions?: Record<string, ComponentPropertyDefinition>;
}

export interface ComponentSetNode extends NodeBase, SceneGeometry {
  type: 'COMPONENT_SET';
  children: ComponentNode[];
}

export interface InstanceNode extends NodeBase, SceneGeometry {
  type: 'INSTANCE';
  mainComponentId: string;
  componentProperties?: Record<string, ComponentPropertyValue>;
  /** Overrides stored as sparse node patches keyed by property path */
  overrides?: Record<string, unknown>;
  children: SceneNode[];
}

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
```

## Paints

```typescript
export type Paint =
  | SolidPaint
  | GradientPaint
  | ImagePaint
  | PatternPaint;

export interface PaintBase {
  type: string;
  visible?: boolean;
  opacity?: number;                  // 0..1
  blendMode?: BlendMode;
  boundVariables?: BoundVariables;   // Phase 5
}

export interface SolidPaint extends PaintBase {
  type: 'SOLID';
  color: RGB;
}

export interface GradientPaint extends PaintBase {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientTransform: [[number, number, number], [number, number, number]];
  gradientStops: { position: number; color: RGBA }[];
}

export interface ImagePaint extends PaintBase {
  type: 'IMAGE';
  imageHash: string;                 // references AssetRegistry key
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageTransform?: [[number, number, number], [number, number, number]];
}

export interface PatternPaint extends PaintBase {
  type: 'PATTERN';
  sourceNodeId: string;              // local reference
  tileType: 'RECTANGULAR' | 'HORIZONTAL_HEXAGONAL' | 'VERTICAL_HEXAGONAL';
  scalingFactor: number;
  spacing?: { x: number; y: number };
}

export interface RGB {
  r: number; g: number; b: number;   // 0..1
}

export interface RGBA extends RGB {
  a: number;                         // 0..1
}

export type BlendMode =
  | 'PASS_THROUGH' | 'NORMAL' | 'DARKEN' | 'MULTIPLY' | 'LINEAR_BURN' | 'COLOR_BURN'
  | 'LIGHTEN' | 'SCREEN' | 'LINEAR_DODGE' | 'COLOR_DODGE' | 'OVERLAY' | 'SOFT_LIGHT'
  | 'HARD_LIGHT' | 'DIFFERENCE' | 'EXCLUSION' | 'HUE' | 'SATURATION' | 'COLOR' | 'LUMINOSITY';
```

## Effects

```typescript
export type Effect =
  | DropShadowEffect
  | InnerShadowEffect
  | LayerBlurEffect
  | BackgroundBlurEffect
  | NoiseEffect
  | TextureEffect;

export interface EffectBase {
  type: string;
  visible?: boolean;
  radius?: number;
  spread?: number;
  color?: RGBA;
  blendMode?: BlendMode;
  boundVariables?: BoundVariables;
}

export interface DropShadowEffect extends EffectBase {
  type: 'DROP_SHADOW';
  offset: { x: number; y: number };
  showShadowBehindNode?: boolean;
}

export interface InnerShadowEffect extends EffectBase {
  type: 'INNER_SHADOW';
  offset: { x: number; y: number };
  showShadowBehindNode?: boolean;
}

export interface LayerBlurEffect extends EffectBase {
  type: 'LAYER_BLUR';
}

export interface BackgroundBlurEffect extends EffectBase {
  type: 'BACKGROUND_BLUR';
}

export interface NoiseEffect extends EffectBase {
  type: 'NOISE';
  noiseSize?: number;
  density?: number;
}

export interface TextureEffect extends EffectBase {
  type: 'TEXTURE';
  imageHash?: string;
}
```

## Variables / styles (Phase 5 placeholders)

```typescript
export interface VariableCollection {
  id: string;
  name: string;
  defaultModeId: string;
  modeIds: string[];
}

export interface Mode {
  id: string;
  name: string;
  collectionId: string;
}

export interface Variable {
  id: string;
  name: string;
  collectionId: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, VariableValue>;
}

export type VariableValue =
  | { type: 'COLOR'; value: RGBA }
  | { type: 'FLOAT'; value: number }
  | { type: 'STRING'; value: string }
  | { type: 'BOOLEAN'; value: boolean };

export interface StyleRegistry {
  paints: Record<string, PaintStyle>;
  texts: Record<string, TextStyle>;
  effects: Record<string, EffectStyle>;
  grids: Record<string, GridStyle>;
}

export interface PaintStyle { id: string; name: string; paints: Paint[]; }
export interface TextStyle { id: string; name: string; text: Partial<TextNode>; }
export interface EffectStyle { id: string; name: string; effects: Effect[]; }
export interface GridStyle { id: string; name: string; layoutGrids: LayoutGrid[]; }

export interface LayoutGrid {
  pattern: 'COLUMNS' | 'ROWS' | 'GRID';
  // ... full fields per PRD Phase 4
  sectionSize?: number;
  visible?: boolean;
  color?: RGBA;
  alignment?: 'MIN' | 'MAX' | 'STRETCH' | 'CENTER';
  gutterSize?: number;
  offset?: number;
  count?: number;
}

export type BoundVariables = Record<string, Binding>;

export interface Binding {
  type: 'VARIABLE_ALIAS';
  id: string;
}
```

## Stroke enums

```typescript
export type StrokeAlign = 'INSIDE' | 'OUTSIDE' | 'CENTER';
export type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL';
export type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND';
```

## Mixed values

When a property can be `figma.mixed` in real Figma, persisted JSON uses:

```typescript
export type Mixed<T> = T | 'MIXED';
```

The engine **must** reject `MIXED` on write from MCP in Phase 1–2; Phase 3+ partial styling paths accept `MIXED` only where explicitly implemented.

## Related documents

- [Document engine](./document-engine.md)
- [Persistence](./persistence.md)
- [Tools schemas](./tools-schemas.md)
