<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-cornerradius -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- cornerRadius

On this page

The number of pixels to round the corners of the object by.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)
- [StarNode](../StarNode.md)
- [VectorNode](../VectorNode.md)

## Signature[​](#signature "Direct link to Signature")

### [cornerRadius](nodes-cornerradius.md): number | [figma.mixed](figma-mixed.md)

## Remarks[​](#remarks "Direct link to Remarks")

This value must be non-negative and can be fractional. If an edge length is less than twice the corner radius, the corner radius for each vertex of the edge will be clamped to half the edge length.

This property can return [`figma.mixed`](figma-mixed.md) if different vertices have different values.properties. Vector nodes can have individual corner radii on each vertex. Rectangle nodes can also have different corner radii on each of the four corners.

[Previous

constraints](nodes-constraints.md)[Next

cornerSmoothing](nodes-cornersmoothing.md)

- [Signature](#signature)
- [Remarks](#remarks)
