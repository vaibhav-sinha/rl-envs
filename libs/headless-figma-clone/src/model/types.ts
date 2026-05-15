/** Phase 1–3 subset of design-doc/data-model.md */

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

export type Paint = SolidPaint | GradientPaint | ImagePaint | PatternPaint;

export interface DropShadowEffect {
  type: 'DROP_SHADOW';
  visible?: boolean;
  offset: { x: number; y: number };
  radius?: number;
  spread?: number;
  color?: RGBA;
}

export type Effect = DropShadowEffect;

export interface NodeBase {
  id: string;
  type: string;
  name: string;
  visible?: boolean;
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

export interface FrameNode extends NodeBase {
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

export interface TextNode extends NodeBase {
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
}

export interface RectangleNode extends NodeBase {
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
}

export interface EllipseNode extends NodeBase {
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

export interface LineNode extends NodeBase {
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

export interface PolygonNode extends NodeBase {
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

export interface StarNode extends NodeBase {
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

export type SceneNode = FrameNode | TextNode | RectangleNode | EllipseNode | LineNode | PolygonNode | StarNode;

export type AnyTreeNode = DocumentNode | PageNode | SceneNode;

export interface FileEnvelope {
  schemaVersion: SchemaVersion;
  fileKey: string;
  fileName: string;
  nextInternalId: number;
  document: DocumentNode;
  assets?: AssetRegistry;
}
