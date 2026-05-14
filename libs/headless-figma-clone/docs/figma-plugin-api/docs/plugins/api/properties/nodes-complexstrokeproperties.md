<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-complexstrokeproperties -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- complexStrokeProperties

On this page

The complex stroke properties for nodes using brush or dynamic strokes.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [InstanceNode](../InstanceNode.md)
- [LineNode](../LineNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)
- [StarNode](../StarNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [VectorNode](../VectorNode.md)

## Signature[​](#signature "Direct link to Signature")

### [complexStrokeProperties](nodes-complexstrokeproperties.md): [ComplexStrokeProperties](../ComplexStrokeProperties.md)

## Remarks[​](#remarks "Direct link to Remarks")

We do not yet support setting custom brushes via the plugin API, but the API will return the brush properties for nodes that use custom brushes.

Setting a dynamic stroke on a stroke with variable width points will remove the variable width points.

When setting a brush on a stroke, you must first ensure that the desired brushes are loaded with [`figma.loadBrushesAsync`](figma-loadbrushesasync.md).

[Previous

clearExplicitVariableModeForCollection](ExplicitVariableModesMixin-clearexplicitvariablemodeforcollection.md)[Next

componentPropertyDefinitions](ComponentPropertiesMixin-componentpropertydefinitions.md)

- [Signature](#signature)
- [Remarks](#remarks)
