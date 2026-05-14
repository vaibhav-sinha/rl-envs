<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-visible -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- visible

On this page

Whether the node is visible or not. Does not affect a plugin's ability to access the node.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
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

### [visible](nodes-visible.md): boolean

## Remarks[​](#remarks "Direct link to Remarks")

The value that this property returns is independent from the node's parent. i.e.

- The node isn't necessarily visible if this is `.visible === true`.
- The node isn't necessarily invisible if this is `.visible === false`.
- An object is visible if `.visible == true` for itself and **all** its parents.

[Previous

variantProperties](nodes-variantproperties.md)[Next

x](nodes-x.md)

- [Signature](#signature)
- [Remarks](#remarks)
