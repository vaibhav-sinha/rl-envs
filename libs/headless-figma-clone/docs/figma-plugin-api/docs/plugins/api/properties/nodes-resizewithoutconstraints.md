<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-resizewithoutconstraints -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- resizeWithoutConstraints

On this page

Resizes the node. Children of the node are never resized, even if those children have constraints. If the parent has auto-layout, causes the parent to be resized (this constraint cannot be ignored).

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

### [resizeWithoutConstraints](nodes-resizewithoutconstraints.md)(width: number, height: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### width[​](#width "Direct link to width")

New width of the node. Must be >= 0.01

### height[​](#height "Direct link to height")

New height of the node. Must be >= 0.01, except for [`LineNode`](../LineNode.md) which must always be given a height of exactly 0.

## Remarks[​](#remarks "Direct link to Remarks")

This function will not cause its children to resize. Use [`resize`](nodes-resize.md) if you need to apply constraints.

caution

⚠️ If this node is a text node with a missing font, the text node will be resized but the text will not re-layout until the next time the text node is opened on a machine that *has* the font. This can cause the text node to re-layout immediately and be surprising to your user. Consider checking the text node property [`hasMissingFont`](../TextNode.md#hasmissingfont) before using this function.

Ignores `targetAspectRatio`. If `targetAspectRatio` has been set, it will be updated to correspond to the post-resize value.

[Previous

resize](nodes-resize.md)[Next

resolvedVariableModes](nodes-resolvedvariablemodes.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [width](#width)
  - [height](#height)
- [Remarks](#remarks)
