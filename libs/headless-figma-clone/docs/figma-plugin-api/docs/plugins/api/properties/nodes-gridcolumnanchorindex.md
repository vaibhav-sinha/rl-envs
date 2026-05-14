<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridcolumnanchorindex -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- gridColumnAnchorIndex

On this page

Applicable only on direct children of grid auto-layout frames. Determines the starting column index for this node within the parent grid.

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

### [gridColumnAnchorIndex](nodes-gridcolumnanchorindex.md): number [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

The column index is 0-based, where 0 is the first column in the grid. This property works in conjunction with gridColumnSpan to determine the node's column position and size in the grid.
If the index provided is greater than the number of columns in the grid, the setter will throw an error.
If the index provided results in the node overlapping with another node in the grid, the setter will throw an error.

[Previous

gridChildVerticalAlign](nodes-gridchildverticalalign.md)[Next

gridColumnCount](nodes-gridcolumncount.md)

- [Signature](#signature)
- [Remarks](#remarks)
