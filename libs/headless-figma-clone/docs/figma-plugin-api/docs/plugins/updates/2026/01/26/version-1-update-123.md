<!-- source: https://developers.figma.com/docs/plugins/updates/2026/01/26/version-1-update-123 -->

## Expanded support for Figma Draw features[​](#expanded-support-for-figma-draw-features "Direct link to Expanded support for Figma Draw features")

You can now use the Plugin API to view and manipulate [Figma Draw](https://www.figma.com/draw/) features, including:

- Creating and editing text on a path nodes
- Viewing and adding transforms in transform groups
- Viewing and adding stretch brush, scatter brush, and dynamic strokes
- Modifying stroke width profiles to create custom variable width strokes or using preset stroke width profiles

We've also updated the documentation around setting [pattern fills and strokes](../../../../adding-pattern-fills-and-strokes.md).

### New types[​](#new-types "Direct link to New types")

- [`TextPathStartData`](../../../../api/TextPathStartData.md): Data defining the starting position of text on a path
- [`TransformModifier`](../../../../api/TransformModifier.md): A modifier that can be applied to a transform group
- [`ComplexStrokeProperties`](../../../../api/ComplexStrokeProperties.md): Stroke properties describing stretch brushes, scatter brushes, and dynamic strokes
- [`VariableWidthStrokeProperties`](../../../../api/VariableWidthStrokeProperties.md): Points that define the width profile of variable width strokes

### New methods[​](#new-methods "Direct link to New methods")

- [`figma.createTextPath(node, startSegment, startPosition)`](../../../../api/properties/figma-createtextpath.md): Create a text on a path node from a vector node.
- [`figma.transformGroup(nodes, parent, index, transformModifiers)`](../../../../api/properties/figma-transformgroup.md): Wrap nodes in a transform group with specified transform modifiers.
- [`figma.loadBrushesAsync(brushType)`](../../../../api/properties/figma-loadbrushesasync.md): Load the first-party brushes of the specified type (stretch or scatter).
- [`node.setFillsAsync(fills)`](../../../../api/node-properties.md#setfillsasync): Supports setting pattern fills.
- [`node.setStrokesAsync(strokes)`](../../../../api/node-properties.md#setstrokesasync): Supports setting pattern strokes.

### New properties[​](#new-properties "Direct link to New properties")

- [`textOnPathNode.textPathStartData`](../../../../api/TextPathNode.md#text-path-node-properties): Gets and sets the starting position data for text on a path node.
- [`transformGroupNode.transformModifiers`](../../../../api/TransformGroupNode.md#transform-group-properties): Gets and sets the transform modifiers applied to a transform group.
- [`node.complexStrokeProperties`](../../../../api/node-properties.md#complexstrokeproperties): Gets and sets the complex stroke properties (brush or dynamic stroke properties) of a node, if any.
- [`node.variableWidthStrokeProperties`](../../../../api/node-properties.md#variablewidthstrokeproperties): Gets and sets the variable width stroke properties of a node, if any.

[Newer post

Version 1, Update 124](../../03/26/version-1-update-124.md)[Older post

Version 1, Update 122](../14/version-1-update-122.md)
