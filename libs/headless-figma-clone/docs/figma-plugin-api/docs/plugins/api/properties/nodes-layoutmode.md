<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutmode -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- layoutMode

On this page

Determines whether this layer uses auto-layout to position its children. Defaults to "NONE".

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [layoutMode](nodes-layoutmode.md): 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property will cause the position of the children of this layer to change as a side-effect. It also causes the size of this layer to change, since at least one dimension of auto-layout frames is automatically calculated.

As a consequence, note that if a frame has `layoutMode === "NONE"`, calling `layoutMode = "VERTICAL"; layoutMode = "NONE"` does not leave the document unchanged. Removing auto-layout from a frame does not restore the children to their original positions.

This property must be set to `"HORIZONTAL"` or `"VERTICAL"` in order for the [`primaryAxisSizingMode`](nodes-primaryaxissizingmode.md), [`counterAxisSizingMode`](nodes-counteraxissizingmode.md), [`layoutWrap`](nodes-layoutwrap.md), [`primaryAxisAlignItems`](nodes-primaryaxisalignitems.md), [`counterAxisAlignItems`](nodes-counteraxisalignitems.md), [`counterAxisAlignContent`](nodes-counteraxisaligncontent.md), [`paddingTop`](../node-properties.md#paddingtop), [`paddingBottom`](../node-properties.md#paddingbottom), [`paddingLeft`](../node-properties.md#paddingleft), [`paddingRight`](../node-properties.md#paddingright), [`itemSpacing`](nodes-itemspacing.md), [`counterAxisSpacing`](nodes-counteraxisspacing.md), [`itemReverseZIndex`](nodes-itemreversezindex.md), and [`strokesIncludedInLayout`](nodes-strokesincludedinlayout.md) properties to be applicable.

Note: `GRID` is not supported for Slot frames, and setting `GRID` will throw a cannotApplyGridToSlot error.

Auto-layout frame with horizontal layout

```
const parentFrame = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(figma.createFrame())  
  
// Parent frame  
// +--------------------------+  
// |+-----------++-----------+|  
// ||           ||           ||  
// ||  Child 1  ||  Child 2  ||  
// ||           ||           ||  
// |+-----------++-----------+|  
// +--------------------------+  
parentFrame.layoutMode = 'HORIZONTAL'
```

Auto-layout frame with vertical layout

```
const parentFrame = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(figma.createFrame())  
  
// Parent frame  
// +-------------+  
// |+-----------+|  
// ||           ||  
// ||  Child 1  ||  
// ||           ||  
// |+-----------+|  
// |+-----------+|  
// ||           ||  
// ||  Child 2  ||  
// ||           ||  
// |+-----------+|  
// +-------------+  
parentFrame.layoutMode = 'VERTICAL'
```

[Previous

layoutGrow](nodes-layoutgrow.md)[Next

layoutPositioning](nodes-layoutpositioning.md)

- [Signature](#signature)
- [Remarks](#remarks)
