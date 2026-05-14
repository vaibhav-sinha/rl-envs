<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutgrow -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- layoutGrow

On this page

This property is applicable only for direct children of auto-layout frames. Determines whether a layer should stretch along the parent’s primary axis. 0 corresponds to a fixed size and 1 corresponds to stretch.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [LineNode](../LineNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SliceNode](../SliceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)

## Signature[​](#signature "Direct link to Signature")

### [layoutGrow](nodes-layoutgrow.md): number

## Remarks[​](#remarks "Direct link to Remarks")

0 and 1 are currently the only supported values.

Note: If the current node is an auto-layout frame (e.g. an auto-layout frame inside a parent auto-layout frame) if you set `layoutGrow` to 1 you should set the corresponding axis – either [`primaryAxisSizingMode`](nodes-primaryaxissizingmode.md) or [`counterAxisSizingMode`](nodes-counteraxissizingmode.md) – to be `“FIXED”`. This is because an auto-layout frame cannot simultaneously stretch to fill its parent and shrink to hug its children.

[Previous

layoutAlign](nodes-layoutalign.md)[Next

layoutMode](nodes-layoutmode.md)

- [Signature](#signature)
- [Remarks](#remarks)
