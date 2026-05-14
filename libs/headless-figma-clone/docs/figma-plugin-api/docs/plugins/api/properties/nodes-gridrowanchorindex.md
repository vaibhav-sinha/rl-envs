<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridrowanchorindex -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- gridRowAnchorIndex

On this page

Applicable only on direct children of grid auto-layout frames. Determines the starting row index for this node within the parent grid.

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

### [gridRowAnchorIndex](nodes-gridrowanchorindex.md): number [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

The row index is 0-based, where 0 is the first row in the grid. This property works in conjunction with gridRowSpan to determine the node's row position and size in the grid.
If the index provided is greater than the number of rows in the grid, the setter will throw an error.
If the index provided results in the node overlapping with another node in the grid, the setter will throw an error.

[Previous

gridColumnSpan](nodes-gridcolumnspan.md)[Next

gridRowCount](nodes-gridrowcount.md)

- [Signature](#signature)
- [Remarks](#remarks)
