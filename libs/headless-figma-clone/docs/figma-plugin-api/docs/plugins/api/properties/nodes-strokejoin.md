<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokejoin -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- strokeJoin

On this page

The decoration applied to vertices which have two or more connected segments.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [LineNode](../LineNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)

## Signature[​](#signature "Direct link to Signature")

### [strokeJoin](nodes-strokejoin.md): [StrokeJoin](../StrokeJoin.md) | [figma.mixed](figma-mixed.md)

## Remarks[​](#remarks "Direct link to Remarks")

On a vector network, the value is set on the whole vector network. Use the vector network API to set it on individual vertices.

This property can return [`figma.mixed`](figma-mixed.md) if different vertices have different values.properties.

[Previous

strokeCap](nodes-strokecap.md)[Next

strokes](nodes-strokes.md)

- [Signature](#signature)
- [Remarks](#remarks)
