<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-constraints -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- constraints

On this page

Constraints of this node relative to its containing [`FrameNode`](../FrameNode.md), if any.

Supported on:

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

## Signature[​](#signature "Direct link to Signature")

### [constraints](nodes-constraints.md): [Constraints](../Constraints.md)

## Remarks[​](#remarks "Direct link to Remarks")

Not all node types have a constraint property. In particular, Group and BooleanOperation nodes do not have a constraint property themselves. Instead, resizing a frame applies the constraints on the children of those nodes.

[Previous

componentPropertyDefinitions](ComponentPropertiesMixin-componentpropertydefinitions.md)[Next

cornerRadius](nodes-cornerradius.md)

- [Signature](#signature)
- [Remarks](#remarks)
