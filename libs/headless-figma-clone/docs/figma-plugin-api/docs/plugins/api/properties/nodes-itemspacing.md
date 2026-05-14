<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-itemspacing -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- itemSpacing

On this page

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines distance between children of the frame.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [itemSpacing](nodes-itemspacing.md): number

## Remarks[​](#remarks "Direct link to Remarks")

For auto-layout frames with [`layoutMode`](nodes-layoutmode.md) set to `"HORIZONTAL"`, this is the horizontal gap between children. For auto-layout frames with [`layoutMode`](nodes-layoutmode.md) set to `"VERTICAL"`, this is the vertical gap between children.

Auto-layout frame with a horizontal gap between children

```
const parentFrame = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(figma.createFrame())  
parentFrame.layoutMode = 'HORIZONTAL'  
  
// Parent frame  
// +------------------------------------+  
// |+-----------+          +-----------+|  
// ||           |          |           ||  
// ||  Child 1  | -- 20 -- |  Child 2  ||  
// ||           |          |           ||  
// |+-----------+          +-----------+|  
// +------------------------------------+  
parentFrame.itemSpacing = 20
```

Auto-layout frame with a vertical gap between children

```
const parentFrame = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(figma.createFrame())  
parentFrame.layoutMode = 'VERTICAL'  
  
// Parent frame  
// +-------------+  
// |+-----------+|  
// ||           ||  
// ||  Child 1  ||  
// ||           ||  
// |+-----------+|  
// |      |      |  
// |      |      |  
// |      20     |  
// |      |      |  
// |      |      |  
// |+-----------+|  
// ||           ||  
// ||  Child 2  ||  
// ||           ||  
// |+-----------+|  
// +-------------+  
parentFrame.itemSpacing = 20
```

[Previous

itemReverseZIndex](nodes-itemreversezindex.md)[Next

layoutAlign](nodes-layoutalign.md)

- [Signature](#signature)
- [Remarks](#remarks)
