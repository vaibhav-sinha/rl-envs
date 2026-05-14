/** Phase-1 subset of design-doc/data-model.md */

export type SchemaVersion = number;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface SolidPaint {
  type: 'SOLID';
  color: RGB;
  visible?: boolean;
  opacity?: number;
}

export type Paint = SolidPaint;

export interface NodeBase {
  id: string;
  type: string;
  name: string;
}

export interface DocumentNode extends NodeBase {
  type: 'DOCUMENT';
  children: PageNode[];
}

export interface PageNode extends NodeBase {
  type: 'PAGE';
  children: FrameNode[];
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
  children: FrameNode[];
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
}

export type SceneNodePhase1 = FrameNode;

export type BaseNodePhase1 = DocumentNode | PageNode | FrameNode;

export interface FileEnvelope {
  schemaVersion: SchemaVersion;
  fileKey: string;
  fileName: string;
  nextInternalId: number;
  document: DocumentNode;
}
