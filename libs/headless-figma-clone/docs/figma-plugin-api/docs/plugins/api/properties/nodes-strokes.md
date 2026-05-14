<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokes -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- strokes

On this page

The paints used to fill the area of the shape's strokes. For help on how to change this value, see [Editing Properties](../../editing-properties.md).

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

### [strokes](nodes-strokes.md): ReadonlyArray<[Paint](../Paint.md)>

## Remarks[​](#remarks "Direct link to Remarks")

In order to set pattern strokes, you must use the [`setStrokesAsync`](../node-properties.md#setstrokesasync) method to ensure that the source node of the pattern is loaded first.

[Previous

strokeJoin](nodes-strokejoin.md)[Next

strokesIncludedInLayout](nodes-strokesincludedinlayout.md)

- [Signature](#signature)
- [Remarks](#remarks)
