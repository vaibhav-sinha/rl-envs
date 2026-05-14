<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutwrap -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- layoutWrap

On this page

Determines whether this layer should use wrapping auto-layout. Defaults to `"NO_WRAP"`.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [layoutWrap](nodes-layoutwrap.md): 'NO\_WRAP' | 'WRAP'

## Remarks[​](#remarks "Direct link to Remarks")

This property can only be set on layers with `layoutMode === "HORIZONTAL"`. Setting it on layers without this property will throw an Error.

This property must be set to `"WRAP"` in order for the [`counterAxisSpacing`](nodes-counteraxisspacing.md) and [`counterAxisAlignContent`](nodes-counteraxisaligncontent.md) properties to be applicable.

[Previous

layoutSizingVertical](nodes-layoutsizingvertical.md)[Next

locked](nodes-locked.md)

- [Signature](#signature)
- [Remarks](#remarks)
