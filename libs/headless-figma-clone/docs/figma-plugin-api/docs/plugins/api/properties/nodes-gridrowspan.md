<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridrowspan -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- gridRowSpan

On this page

Applicable only on direct children of grid auto-layout frames. Determines the number of rows this node will span within the parent grid.

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

### [gridRowSpan](nodes-gridrowspan.md): number

## Remarks[​](#remarks "Direct link to Remarks")

Must be a positive integer. This property defines how many rows the node will occupy starting from gridRowAnchorIndex.
If the span provided results in the node overlapping with another node in the grid, the setter will throw an error.
If the span provided results in the node extending beyond the grid's defined rows, the setter will throw an error.

[Previous

gridRowSizes](nodes-gridrowsizes.md)[Next

id](nodes-id.md)

- [Signature](#signature)
- [Remarks](#remarks)
