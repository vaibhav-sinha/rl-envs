<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-adddevresourceasync -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- addDevResourceAsync

On this page

Adds a dev resource to a node. This will fail if the node already has a dev resource with the same url.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [DocumentNode](../DocumentNode.md)
- [EllipseNode](../EllipseNode.md)
- [EmbedNode](../EmbedNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [InteractiveSlideElementNode](../InteractiveSlideElementNode.md)
- [LineNode](../LineNode.md)
- [LinkUnfurlNode](../LinkUnfurlNode.md)
- [MediaNode](../MediaNode.md)
- [PageNode](../PageNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SliceNode](../SliceNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [StickyNode](../StickyNode.md)
- [TableNode](../TableNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)
- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### addDevResourceAsync(url: string, name?: string): Promise<void>

## Parameters[​](#parameters "Direct link to Parameters")

### url[​](#url "Direct link to url")

The url of the dev resource.

### name[​](#name "Direct link to name")

The name of the dev resource. If not provided, Figma will get the name from the url.

[Previous

Shared Node Properties](../node-properties.md)[Next

appendChild](nodes-appendchild.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [url](#url)
  - [name](#name)
