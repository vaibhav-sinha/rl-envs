<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokealign -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- strokeAlign

On this page

The alignment of the stroke with respect to the boundaries of the shape.

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

### [strokeAlign](nodes-strokealign.md): 'CENTER' | 'INSIDE' | 'OUTSIDE'

## Remarks[​](#remarks "Direct link to Remarks")

Center-aligned stroke means the center of the stroke falls exactly on the geometry. Inside-aligned stroke shifts the stroke so it lies completely inside the shape, and outside-aligned stroke is vice versa.

info

Inside and outside stroke are actually implemented by doubling the stroke weight and masking the stroke by the fill. This means inside-aligned stroke will never draw strokes outside the fill and outside-aligned stroke will never draw strokes inside the fill.

[Previous

setSharedPluginData](nodes-setsharedplugindata.md)[Next

strokeCap](nodes-strokecap.md)

- [Signature](#signature)
- [Remarks](#remarks)
