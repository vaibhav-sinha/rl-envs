<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-counteraxisaligncontent -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- counterAxisAlignContent

On this page

Applicable only on auto-layout frames with [`layoutWrap`](nodes-layoutwrap.md) set to `"WRAP"`. Determines how the wrapped tracks are spaced out inside of the auto-layout frame.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [counterAxisAlignContent](nodes-counteraxisaligncontent.md): 'AUTO' | 'SPACE\_BETWEEN'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property on a non-wrapping auto-layout frame will throw an error.

- `"AUTO"`: If all children of this auto-layout frame have [`layoutAlign`](nodes-layoutalign.md) set to `"STRETCH"`, the tracks will stretch to fill the auto-layout frame. This is like flexbox `align-content: stretch`. Otherwise, each track will be as tall as the tallest child of the track, and will align based on the value of [`counterAxisAlignItems`](nodes-counteraxisalignitems.md). This is like flexbox `align-content: start | center | end`. [`counterAxisSpacing`](nodes-counteraxisspacing.md) is respected when `counterAxisAlignContent` is set to `"AUTO"`.
- `"SPACE_BETWEEN"`: Tracks are all sized based on the tallest child in the track. The free space within the auto-layout frame is divided up evenly between each track. If the total height of all tracks is taller than the height of the auto-layout frame, the spacing will be 0.

[Previous

cornerSmoothing](nodes-cornersmoothing.md)[Next

counterAxisAlignItems](nodes-counteraxisalignitems.md)

- [Signature](#signature)
- [Remarks](#remarks)
