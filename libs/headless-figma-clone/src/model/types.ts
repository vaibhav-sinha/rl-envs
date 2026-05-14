/** Phase-1/2 subset of design-doc/data-model.md */

export type SchemaVersion = number;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a?: number;
}

export interface SolidPaint {
  type: 'SOLID';
  color: RGB;
  visible?: boolean;
  opacity?: number;
}

export type Paint = SolidPaint;

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

export interface FrameNode extends NodeBase {
  type: 'FRAME';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  children: SceneNode[];
  fills?: Paint[];
  /** Renders behind fills (Phase 2). */
  backgrounds?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
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
  characters: string;
  fontSize?: number;
  fontWeight?: number;
  fills?: Paint[];
  effects?: Effect[];
  /** Empty or absent: entire string uses node-level style. */
  styledSegments?: StyledSegment[];
}

export type SceneNode = FrameNode | TextNode;

export type AnyTreeNode = DocumentNode | PageNode | SceneNode;

export interface FileEnvelope {
  schemaVersion: SchemaVersion;
  fileKey: string;
  fileName: string;
  nextInternalId: number;
  document: DocumentNode;
}
