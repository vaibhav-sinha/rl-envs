<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-counteraxisspacing -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- counterAxisSpacing

On this page

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames with [`layoutWrap`](nodes-layoutwrap.md) set to `"WRAP"`. Determines the distance between wrapped tracks. The value must be positive.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [counterAxisSpacing](nodes-counteraxisspacing.md): number | null

## Remarks[​](#remarks "Direct link to Remarks")

Set this propety to `null` to have it sync with [`itemSpacing`](nodes-itemspacing.md). This will never return `null`. Once set to `null`, it will start returning the value of [`itemSpacing`](nodes-itemspacing.md).

Auto-layout frame with children wrapping to the next line

```
const parentFrame = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(figma.createFrame())  
  
// Make children flow horizontally and wrap  
parentFrame.layoutMode = 'HORIZONTAL'  
parentFrame.layoutWrap = 'WRAP'  
  
// Set a fixed width so when we set itemSpacing below, the children will wrap  
parentFrame.primaryAxisSizingMode = 'FIXED'  
  
// Let the height of the parent frame resize to fit the children  
parentFrame.counterAxisSizingMode = 'AUTO'  
  
// Horizontal gap between children  
parentFrame.itemSpacing = 10  
  
// Parent frame  
// +------------------------------------------+  
// |+-----------+          +-----------+      |  
// ||           |          |           |      |  
// ||  Child 1  | -- 10 -- |  Child 2  |      |  
// ||           |          |           |      |  
// |+-----------+          +-----------+      |  
// |      |                                   |  
// |      |                                   |  
// |      20                                  |  
// |      |                                   |  
// |      |                                   |  
// |+-----------+                             |  
// ||           |                             |  
// ||  Child 3  |                             |  
// ||           |                             |  
// |+-----------+                             |  
// +------------------------------------------+  
parentFrame.counterAxisSpacing = 20
```

[Previous

counterAxisSizingMode](nodes-counteraxissizingmode.md)[Next

deleteCharacters](TextNode-deletecharacters.md)

- [Signature](#signature)
- [Remarks](#remarks)
