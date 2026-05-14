<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridrowcount -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- gridRowCount

On this page

Applicable only on auto-layout frames with `layoutMode` set to `"GRID"`. Determines the number of rows in the grid.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [gridRowCount](nodes-gridrowcount.md): number

## Remarks[​](#remarks "Direct link to Remarks")

If the setter for this value is called on a grid with a value less than 1, it will throw an error.
Users cannot remove rows from a grid if they are occupied by children, so if you try to reduce the count of rows in a grid and some of those rows have children, it will throw an error.
By default, when the row count is increased, the new rows will be added as [`GridTrackSize`](../GridTrackSize.md) objects with type `"FLEX"`. If you want to change the type of the new rows, you can use the setters on GridTrackSize objects returned by [`gridRowSizes`](nodes-gridrowsizes.md) or [`gridColumnSizes`](nodes-gridcolumnsizes.md).

Grid layout with 2 rows and 3 columns

```
const parentFrame = figma.createFrame()  
parentFrame.layoutMode = 'GRID'  
parentFrame.gridRowCount = 2  
parentFrame.gridColumnCount = 3  
  
// Grid frame with 2 rows and 3 columns  
// + --- + --- + --- +  
// |     |     |     |  
// + --- + --- + --- +  
// |     |     |     |  
// + --- + --- + --- +
```

[Previous

gridRowAnchorIndex](nodes-gridrowanchorindex.md)[Next

gridRowGap](nodes-gridrowgap.md)

- [Signature](#signature)
- [Remarks](#remarks)
