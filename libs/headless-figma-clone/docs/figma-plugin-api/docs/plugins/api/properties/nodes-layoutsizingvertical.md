<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizingvertical -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- layoutSizingVertical

On this page

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](nodes-layoutgrow.md), [`layoutAlign`](nodes-layoutalign.md), [`primaryAxisSizingMode`](nodes-primaryaxissizingmode.md), and [`counterAxisSizingMode`](nodes-counteraxissizingmode.md). This field maps directly to the "Vertical sizing" dropdown in the Figma UI.

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

### [layoutSizingVertical](nodes-layoutsizingvertical.md): 'FIXED' | 'HUG' | 'FILL'

## Remarks[​](#remarks "Direct link to Remarks")

`"HUG"` is only valid on auto-layout frames and text nodes. `"FILL"` is only valid on auto-layout children. Setting these values when they don't apply will throw an error.

[Previous

layoutSizingHorizontal](nodes-layoutsizinghorizontal.md)[Next

layoutWrap](nodes-layoutwrap.md)

- [Signature](#signature)
- [Remarks](#remarks)
