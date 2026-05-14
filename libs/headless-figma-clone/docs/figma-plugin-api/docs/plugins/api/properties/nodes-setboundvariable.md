<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- setBoundVariable

On this page

Binds the provided `field` on this node to the given variable. Please see the [Working with Variables](../../working-with-variables.md) guide for how to get and set variable bindings.

If `null` is provided as the variable, the given `field` will be unbound from any variables.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [EllipseNode](../EllipseNode.md)
- [EmbedNode](../EmbedNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [InteractiveSlideElementNode](../InteractiveSlideElementNode.md)
- [LineNode](../LineNode.md)
- [LinkUnfurlNode](../LinkUnfurlNode.md)
- [MediaNode](../MediaNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SliceNode](../SliceNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [StickyNode](../StickyNode.md)
- [TableNode](../TableNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)
- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### setBoundVariable(field: [VariableBindableNodeField](../VariableBindableNodeField.md) | [VariableBindableTextField](../VariableBindableTextField.md), variable: [Variable](../Variable.md) | null): void

## Parameters[​](#parameters "Direct link to Parameters")

### field[​](#field "Direct link to field")

The field to bind the variable to.

### variable[​](#variable "Direct link to variable")

The variable to bind to the field. If `null` is provided, the field will be unbound from any variables. Make sure to pass a Variable object or null; passing a variable ID is deprecated.

[Previous

rotation](nodes-rotation.md)[Next

setExplicitVariableModeForCollection](ExplicitVariableModesMixin-setexplicitvariablemodeforcollection.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [field](#field)
  - [variable](#variable)
