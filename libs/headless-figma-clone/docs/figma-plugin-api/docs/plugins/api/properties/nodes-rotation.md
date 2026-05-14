<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-rotation -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- rotation

On this page

The rotation of the node in degrees. Returns values from -180 to 180. Identical to `Math.atan2(-m10, m00)` in the [`relativeTransform`](nodes-relativetransform.md) matrix. When setting `rotation`, it will also set `m00`, `m01`, `m10`, `m11`.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
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

### [rotation](nodes-rotation.md): number

## Remarks[​](#remarks "Direct link to Remarks")

The rotation is with respect to the top-left of the object. Therefore, it is independent from the position of the object. If you want to rotate with respect to the center (or any arbitrary point), you can do so via matrix transformations and [`relativeTransform`](nodes-relativetransform.md).

[Previous

resolvedVariableModes](nodes-resolvedvariablemodes.md)[Next

setBoundVariable](nodes-setboundvariable.md)

- [Signature](#signature)
- [Remarks](#remarks)
