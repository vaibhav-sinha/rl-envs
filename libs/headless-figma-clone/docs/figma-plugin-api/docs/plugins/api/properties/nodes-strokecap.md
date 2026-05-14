<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokecap -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- strokeCap

On this page

The decoration applied to vertices which have only one connected segment.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [LineNode](../LineNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)

## Signature[​](#signature "Direct link to Signature")

### [strokeCap](nodes-strokecap.md): [StrokeCap](../StrokeCap.md) | [figma.mixed](figma-mixed.md)

## Remarks[​](#remarks "Direct link to Remarks")

On a vector network, the value is set on the whole vector network. Use the vector network API to set it on individual vertices.

This property can return [`figma.mixed`](figma-mixed.md) if different vertices have different values.properties.

[Previous

strokeAlign](nodes-strokealign.md)[Next

strokeJoin](nodes-strokejoin.md)

- [Signature](#signature)
- [Remarks](#remarks)
