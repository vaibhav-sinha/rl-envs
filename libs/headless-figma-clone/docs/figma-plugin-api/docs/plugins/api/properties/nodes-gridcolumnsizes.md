<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-gridcolumnsizes -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- gridColumnSizes

On this page

Only applicable on auto-layout frames with `layoutMode` set to `"GRID"`.
Returns an array of [`GridTrackSize`](../GridTrackSize.md) objects representing the columns in the grid in order.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [gridColumnSizes](nodes-gridcolumnsizes.md): Array<[GridTrackSize](../GridTrackSize.md)>

## Remarks[​](#remarks "Direct link to Remarks")

The order of the columns is from left to right.
The [`GridTrackSize`](../GridTrackSize.md) can be used to change the type of the column (either `"FLEX"` or `"FIXED"`) and the size of the track (if it is a `"FIXED"` track).

[Previous

gridColumnGap](nodes-gridcolumngap.md)[Next

gridColumnSpan](nodes-gridcolumnspan.md)

- [Signature](#signature)
- [Remarks](#remarks)
