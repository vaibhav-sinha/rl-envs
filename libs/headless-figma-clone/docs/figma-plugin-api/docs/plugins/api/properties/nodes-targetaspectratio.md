<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-targetaspectratio -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- targetAspectRatio

On this page

When toggled, causes the layer to keep its proportions when the user resizes it via auto layout, constraints, the properties panel, or on-canvas.
If not set, the node does NOT resize toward a specific targetAspectRatio.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
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

### [targetAspectRatio](nodes-targetaspectratio.md): [Vector](../Vector.md) | null [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

Use `lockAspectRatio` and `unlockAspectRatio` to set targetAspectRatio.

```
const parentFrame = figma.createFrame()  
const image = await figma.createNodeFromJSXAsync(  
  <figma.widget.Image  
    src="https://picsum.photos/200/300"  
    width={200}  
    height={300}  
  />  
)  
parentFrame.appendChild(image)  
  
image.lockAspectRatio() // set to 2:3 ratio, implicit from the size  
  
// Add autolayout to parent, which defaults to Hug x Hug  
parentFrame.layoutMode = 'HORIZONTAL'  
  
// Set child to fill-width  
image.layoutGrow = 1  
  
// Resize parent to be much larger  
parentFrame.resize(500, 1000)  
  
// Since the child is fill-width, it will expand to the available space  
image.width == 500  
image.height == 750  
// Image maintains the 2:3 ratio even as it grew with auto layout!
```

caution

⚠️ `targetAspectRatio` cannot be used with auto-resizing text (TextNodes where textAutoResize !== NONE).

[Previous

stuckTo](nodes-stuckto.md)[Next

toString](nodes-tostring.md)

- [Signature](#signature)
- [Remarks](#remarks)
