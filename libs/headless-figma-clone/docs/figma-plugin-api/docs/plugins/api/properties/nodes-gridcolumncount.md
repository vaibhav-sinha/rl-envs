<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridcolumncount -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- gridColumnCount

On this page

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the number of columns in the grid.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [gridColumnCount](nodes-gridcolumncount.md): number

## Remarks[​](#remarks "Direct link to Remarks")

If the setter for this value is called on a grid with a value less than 1, it will throw an error.
Users cannot remove columns from a grid if they are occupied by children, so if you try to reduce the count of columns in a grid and some of those columns have children, it will throw an error.
By default, when the column count is increased, the new columns will be added as [`GridTrackSize`](../GridTrackSize.md) objects with type `"FLEX"`. If you want to change the type of the new columns, you can use the setters on GridTrackSize objects returned by [`gridRowSizes`](nodes-gridrowsizes.md) or [`gridColumnSizes`](nodes-gridcolumnsizes.md).

[Previous

gridColumnAnchorIndex](nodes-gridcolumnanchorindex.md)[Next

gridColumnGap](nodes-gridcolumngap.md)

- [Signature](#signature)
- [Remarks](#remarks)
