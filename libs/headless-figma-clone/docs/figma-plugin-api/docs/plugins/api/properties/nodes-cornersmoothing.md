<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-cornersmoothing -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- cornerSmoothing

On this page

A value that lets you control how "smooth" the corners are. Ranges from 0 to 1.

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

### [cornerSmoothing](nodes-cornersmoothing.md): number

## Remarks[​](#remarks "Direct link to Remarks")

A value of 0 is the default and means that the corner is perfectly circular. A value of 0.6 means the corner matches the iOS 7 "squircle" icon shape. Other values produce various other curves. See [this post](https://www.figma.com/blog/desperately-seeking-squircles/) for the gory details!

[Previous

cornerRadius](nodes-cornerradius.md)[Next

counterAxisAlignContent](nodes-counteraxisaligncontent.md)

- [Signature](#signature)
- [Remarks](#remarks)
