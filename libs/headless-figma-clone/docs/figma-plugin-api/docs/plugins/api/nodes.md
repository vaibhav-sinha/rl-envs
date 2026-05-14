<!-- source: https://developers.figma.com/docs/plugins/api/nodes -->

- Plugins
- Node Types

In Figma, the Node is the basis for representing layers. There are many different types of nodes, each with their own set of properties.

- [`BooleanOperationNode`](BooleanOperationNode.md)
- [`CodeBlockNode`](CodeBlockNode.md)
- [`ComponentNode`](ComponentNode.md)
- [`ComponentSetNode`](ComponentSetNode.md)
- [`ConnectorNode`](ConnectorNode.md)
- [`DocumentNode`](DocumentNode.md)
- [`EllipseNode`](EllipseNode.md)
- [`EmbedNode`](EmbedNode.md)
- [`FrameNode`](FrameNode.md)
- [`GroupNode`](GroupNode.md)
- [`HighlightNode`](HighlightNode.md)
- [`InstanceNode`](InstanceNode.md)
- [`InteractiveSlideElementNode`](InteractiveSlideElementNode.md)
- [`LineNode`](LineNode.md)
- [`LinkUnfurlNode`](LinkUnfurlNode.md)
- [`MediaNode`](MediaNode.md)
- [`PageNode`](PageNode.md)
- [`PolygonNode`](PolygonNode.md)
- [`RectangleNode`](RectangleNode.md)
- [`RemovedNode`](RemovedNode.md)
- [`SectionNode`](SectionNode.md)
- [`ShapeWithTextNode`](ShapeWithTextNode.md)
- [`SliceNode`](SliceNode.md)
- [`SlideGridNode`](SlideGridNode.md)
- [`SlideNode`](SlideNode.md)
- [`SlideRowNode`](SlideRowNode.md)
- [`SlotNode`](SlotNode.md)
- [`StampNode`](StampNode.md)
- [`StarNode`](StarNode.md)
- [`StickyNode`](StickyNode.md)
- [`TableCellNode`](TableCellNode.md)
- [`TableNode`](TableNode.md)
- [`TextNode`](TextNode.md)
- [`TextPathNode`](TextPathNode.md)
- [`TransformGroupNode`](TransformGroupNode.md)
- [`VectorNode`](VectorNode.md)
- [`WashiTapeNode`](WashiTapeNode.md)
- [`WidgetNode`](WidgetNode.md)

In the [Typings File](typings.md), each node type is represented with an interface. The most general `BaseNode` is always one of those interfaces:

```
type BaseNode =  
  DocumentNode |  
  PageNode |  
  SceneNode
```

Most often, you will work with nodes contained within a page, also referred to as "scene nodes".

```
type SceneNode =  
  BooleanOperationNode |  
  CodeBlockNode |  
  ComponentNode |  
  ComponentSetNode |  
  ConnectorNode |  
  EllipseNode |  
  EmbedNode |  
  FrameNode |  
  GroupNode |  
  HighlightNode |  
  InstanceNode |  
  InteractiveSlideElementNode |  
  LineNode |  
  LinkUnfurlNode |  
  MediaNode |  
  PolygonNode |  
  RectangleNode |  
  SectionNode |  
  ShapeWithTextNode |  
  SliceNode |  
  SlideGridNode |  
  SlideNode |  
  SlideRowNode |  
  SlotNode |  
  StampNode |  
  StarNode |  
  StickyNode |  
  TableNode |  
  TextNode |  
  TextPathNode |  
  TransformGroupNode |  
  VectorNode |  
  WashiTapeNode |  
  WidgetNode
```

Each node has a type property that tells you the type of the node. The list of node types is declared in NodeType. **You will typically use `node.type` when examining a node.**

```
type NodeType =  
  "BOOLEAN_OPERATION" |  
  "CODE_BLOCK" |  
  "COMPONENT" |  
  "COMPONENT_SET" |  
  "CONNECTOR" |  
  "DOCUMENT" |  
  "ELLIPSE" |  
  "EMBED" |  
  "FRAME" |  
  "GROUP" |  
  "HIGHLIGHT" |  
  "INSTANCE" |  
  "INTERACTIVE_SLIDE_ELEMENT" |  
  "LINE" |  
  "LINK_UNFURL" |  
  "MEDIA" |  
  "PAGE" |  
  "POLYGON" |  
  "RECTANGLE" |  
  "SECTION" |  
  "SHAPE_WITH_TEXT" |  
  "SLICE" |  
  "SLIDE" |  
  "SLIDE_GRID" |  
  "SLIDE_ROW" |  
  "SLOT" |  
  "STAMP" |  
  "STAR" |  
  "STICKY" |  
  "TABLE" |  
  "TABLE_CELL" |  
  "TEXT" |  
  "TEXT_PATH" |  
  "TRANSFORM_GROUP" |  
  "VECTOR" |  
  "WASHI_TAPE" |  
  "WIDGET"
```

In the [Typings File](typings.md), you will also find references to "mixin" interfaces. This is just a way to group related properties together. For example: pages, frames and groups can all have children, so they all have children-related properties such as `.children`, `.appendChild`.

Our node properties can't be modeled using traditional object-oriented class hierarchy which is why we use the concept of mixins. The `ChildrenMixin` define the properties that all nodes with children have (e.g. append, insert) and `FrameNode`s, `PageNode`s, etc all compose `ChildrenMixin`. However, a `RectangleNode` cannot have children and therefore does not inherit from `ChildrenMixin`.

[Previous

fetch](properties/global-fetch.md)[Next

BooleanOperationNode](BooleanOperationNode.md)
