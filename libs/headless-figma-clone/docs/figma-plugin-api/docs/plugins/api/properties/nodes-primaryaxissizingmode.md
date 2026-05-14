<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-primaryaxissizingmode -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- primaryAxisSizingMode

On this page

Applicable only on auto-layout frames. Determines whether the primary axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [primaryAxisSizingMode](nodes-primaryaxissizingmode.md): 'FIXED' | 'AUTO'

## Remarks[​](#remarks "Direct link to Remarks")

Auto-layout frames have a **primary axis**, which is the axis that resizes when you add new items into the frame. For example, frames with "VERTICAL" [`layoutMode`](nodes-layoutmode.md) resize in the y-axis.

- `"FIXED"`: The primary axis length is determined by the user or plugins, unless the [`layoutAlign`](nodes-layoutalign.md) is set to “STRETCH” or [`layoutGrow`](nodes-layoutgrow.md) is 1.
- `"AUTO"`: The primary axis length is determined by the size of the children. If set, the auto-layout frame will automatically resize along the counter axis to fit its children.

Note: `“AUTO”` should not be used in any axes where [`layoutAlign`](nodes-layoutalign.md) = “STRETCH” or [`layoutGrow`](nodes-layoutgrow.md) = 1. Either use `“FIXED”` or disable [`layoutAlign`](nodes-layoutalign.md)/[`layoutGrow`](nodes-layoutgrow.md).

[Previous

primaryAxisAlignItems](nodes-primaryaxisalignitems.md)[Next

reactions](nodes-reactions.md)

- [Signature](#signature)
- [Remarks](#remarks)
