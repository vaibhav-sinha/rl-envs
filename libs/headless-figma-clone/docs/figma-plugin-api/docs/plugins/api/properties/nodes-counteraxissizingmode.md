<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-counteraxissizingmode -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- counterAxisSizingMode

On this page

Applicable only on auto-layout frames. Determines whether the counter axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [counterAxisSizingMode](nodes-counteraxissizingmode.md): 'FIXED' | 'AUTO'

## Remarks[​](#remarks "Direct link to Remarks")

Auto-layout frames have a **primary axis**, which is the axis that resizes when you add new items into the frame. For example, frames with "VERTICAL" [`layoutMode`](nodes-layoutmode.md) resize in the y-axis.

The other axis is called the **counter axis**.

- `"FIXED"`: The counter axis length is determined by the user or plugins, unless the [`layoutAlign`](nodes-layoutalign.md) is set to “STRETCH” or [`layoutGrow`](nodes-layoutgrow.md) is 1.
- `"AUTO"`: The counter axis length is determined by the size of the children. If set, the auto-layout frame will automatically resize along the counter axis to fit its children.

Note: `“AUTO”` cannot be used in any axes where [`layoutAlign`](nodes-layoutalign.md) = “STRETCH” or [`layoutGrow`](nodes-layoutgrow.md) = 1. Either use `“FIXED”` or disable [`layoutAlign`](nodes-layoutalign.md)/[`layoutGrow`](nodes-layoutgrow.md).

Horizontal auto-layout frame with different counterAxisSizingMode values

```
const parentFrame = figma.createFrame()  
const child2 = figma.createFrame()  
// Make the second child 200px high instead of the default 100px  
child2.resize(100, 200)  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(child2)  
parentFrame.layoutMode = 'HORIZONTAL'  
  
// Parent frame  
// +--------------------------+  
// |+-----------++-----------+|  
// ||           ||           ||  
// ||  Child 1  ||  Child 2  ||  
// ||           ||           ||  
// |+-----------+|           ||  
// +--------------------------+  
parentFrame.counterAxisSizingMode = 'FIXED' // Child 2 is clipped  
  
// Parent frame  
// +--------------------------+  
// |+-----------++-----------+|  
// ||           ||           ||  
// ||  Child 1  ||  Child 2  ||  
// ||           ||           ||  
// |+-----------+|           ||  
// |             |           ||  
// |             |           ||  
// |             +-----------+|  
// +--------------------------+  
parentFrame.counterAxisSizingMode = 'AUTO'
```

[Previous

counterAxisAlignItems](nodes-counteraxisalignitems.md)[Next

counterAxisSpacing](nodes-counteraxisspacing.md)

- [Signature](#signature)
- [Remarks](#remarks)
