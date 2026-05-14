<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-overflowdirection -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- overflowDirection

On this page

Determines whether a frame will scroll in presentation mode when the frame contains content that exceed the frame's bounds. Reflects the value shown in "Overflow Behavior" in the Prototype tab.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [FrameNode](../FrameNode.md)
- [InstanceNode](../InstanceNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [overflowDirection](nodes-overflowdirection.md): [OverflowDirection](../OverflowDirection.md)

## Remarks[​](#remarks "Direct link to Remarks")

Frames directly parented under the canvas don't need this property to be set or for content to exceed the frame's bounds in order to scroll in presentation mode. They just need the frame to be bigger than the device or screen and will scroll automatically.

[Previous

openTypeFeatures](TextNode-opentypefeatures.md)[Next

parent](nodes-parent.md)

- [Signature](#signature)
- [Remarks](#remarks)
