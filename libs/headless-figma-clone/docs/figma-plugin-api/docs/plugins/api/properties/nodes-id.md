<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-id -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- id

On this page

The unique identifier of a node. For example, `1:3`. The node id can be used with methods such as [`figma.getNodeByIdAsync`](../figma.md#getnodebyidasync), but plugins typically don't need to use this since you can usually just access a node directly.

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

### [id](nodes-id.md): string [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

One possible use case for using the `id` is to have a serializable representation of a Figma node. To "deserialize" an id back into a node, pass it to [`figma.getNodeByIdAsync`](../figma.md#getnodebyidasync). This will return null if the node is no longer present in the document.

In the URLs for Figma files, node ids are hyphenated. However, for use with the API, node ids must use colons. For example, if a Figma file URL has the node id `1-3`, you must convert it to `1:3`.

[Previous

gridRowSpan](nodes-gridrowspan.md)[Next

inferredVariables](nodes-inferredvariables.md)

- [Signature](#signature)
- [Remarks](#remarks)
