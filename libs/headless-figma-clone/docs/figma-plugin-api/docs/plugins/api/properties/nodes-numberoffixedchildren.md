<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-numberoffixedchildren -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- numberOfFixedChildren

On this page

Determines which children of the frame are fixed children in a scrolling frame.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [FrameNode](../FrameNode.md)
- [InstanceNode](../InstanceNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [numberOfFixedChildren](nodes-numberoffixedchildren.md): number

## Remarks[​](#remarks "Direct link to Remarks")

In Figma, fixed children are always on top of scrolling (non-fixed) children. Despite the "Fix position when scrolling" checkbox in the UI, fixed layers are not represented as a boolean property on individual layers. Instead, what we really have are two sections of children inside each frame. These section headers are visible in the layers panel when a frame has at least one fixed child.

[Previous

name](nodes-name.md)[Next

openTypeFeatures](TextNode-opentypefeatures.md)

- [Signature](#signature)
- [Remarks](#remarks)
