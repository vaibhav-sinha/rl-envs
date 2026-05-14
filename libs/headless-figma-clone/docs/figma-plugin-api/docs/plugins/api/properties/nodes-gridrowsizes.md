<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridrowsizes -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- gridRowSizes

On this page

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`.
Returns an array of [`GridTrackSize`](../GridTrackSize.md) objects representing the rows in the grid in order.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [gridRowSizes](nodes-gridrowsizes.md): Array<[GridTrackSize](../GridTrackSize.md)>

## Remarks[​](#remarks "Direct link to Remarks")

The order of the rows is from top to bottom.
The [`GridTrackSize`](../GridTrackSize.md) can be used to change the type of the row (either `"FLEX"` or `"FIXED"`) and the size of the track (if it is a `"FIXED"` track).

Grid layout with mixed track sizes and types

```
const parentFrame = figma.createFrame()  
parentFrame.layoutMode = 'GRID'  
parentFrame.gridRowCount = 2  
parentFrame.gridColumnCount = 3  
  
// Change the first row to be a fixed size of 100px  
parentFrame.gridRowSizes[0].type // 'FLEX'  
parentFrame.gridRowSizes[0].type = 'FIXED'  
parentFrame.gridRowSizes[0].value = 100  
parentFrame.gridRowSizes[0].type // 'FIXED'  
// Grid with one fixed row and one flexible rows  
// + --- + --- + --- +  
// |     |     |     | 100px height  
// + --- + --- + --- +  
// |     |     |     |  
// |     |     |     | 'flex' height  
// |     |     |     |  occupies remaining height in the container, because there is only one flex row.  
// |     |     |     |  
// + --- + --- + --- +
```

[Previous

gridRowGap](nodes-gridrowgap.md)[Next

gridRowSpan](nodes-gridrowspan.md)

- [Signature](#signature)
- [Remarks](#remarks)
