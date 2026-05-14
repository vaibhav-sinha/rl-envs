<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutsizinghorizontal -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- layoutSizingHorizontal

On this page

Applicable only on auto-layout frames, their children, and text nodes. This is a shorthand for setting [`layoutGrow`](nodes-layoutgrow.md), [`layoutAlign`](nodes-layoutalign.md), [`primaryAxisSizingMode`](nodes-primaryaxissizingmode.md), and [`counterAxisSizingMode`](nodes-counteraxissizingmode.md). This field maps directly to the "Horizontal sizing" dropdown in the Figma UI.

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

### [layoutSizingHorizontal](nodes-layoutsizinghorizontal.md): 'FIXED' | 'HUG' | 'FILL'

## Remarks[​](#remarks "Direct link to Remarks")

`"HUG"` is only valid on auto-layout frames and text nodes. `"FILL"` is only valid on auto-layout children. Setting these values when they don't apply will throw an error.

Setting layoutSizingHorizontal on an auto-layout frame

```
const parentFrame = figma.createFrame()  
const child2 = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(child2)  
parentFrame.layoutMode = 'VERTICAL'  
// Make the second child twice as wide as the first  
child2.resize(200, 100)  
  
// Parent frame (child 2 is clipped)  
// +-------------+  
// |+-----------+|  
// ||           ||  
// ||  Child 1  ||  
// ||           ||  
// |+-----------+|  
// |+------------|  
// ||            |  
// ||  Child 2   |  
// ||            |  
// |+------------|  
// +-------------+  
  
parentFrame.layoutSizingHorizontal = 'FIXED'  
  
// Parent frame (child 2 is not clipped)  
// +------------------------+  
// |+-----------+           |  
// ||           |           |  
// ||  Child 1  |           |  
// ||           |           |  
// |+-----------+           |  
// |+----------------------+|  
// ||                      ||  
// ||       Child 2        ||  
// ||                      ||  
// |+----------------------+|  
// +------------------------+  
parentFrame.layoutSizingHorizontal = 'HUG'
```

Setting layoutSizingHorizontal on an auto-layout child

```
const parentFrame = figma.createFrame()  
const child2 = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(child2)  
parentFrame.layoutMode = 'HORIZONTAL'  
parentFrame.resize(300, 100)  
  
// Parent frame  
// +-------------------------------------+  
// |+-----------++-----------+           |  
// ||           ||           |           |  
// ||  Child 1  ||  Child 2  |           |  
// ||           ||           |           |  
// |+-----------++-----------+           |  
// +-------------------------------------+  
child2.layoutSizingHorizontal = 'FIXED'  
  
// Parent frame  
// +-------------------------------------+  
// |+-----------++----------------------+|  
// ||           ||                      ||  
// ||  Child 1  ||       Child 2        ||  
// ||           ||                      ||  
// |+-----------++----------------------+|  
// +-------------------------------------+  
child2.layoutSizingHorizontal = 'FILL'
```

[Previous

layoutPositioning](nodes-layoutpositioning.md)[Next

layoutSizingVertical](nodes-layoutsizingvertical.md)

- [Signature](#signature)
- [Remarks](#remarks)
