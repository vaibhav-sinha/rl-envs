<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-layoutpositioning -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- layoutPositioning

On this page

This property is applicable only for direct children of auto-layout frames. Determines whether a layer's size and position should be dermined by auto-layout settings or manually adjustable.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
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

### [layoutPositioning](nodes-layoutpositioning.md): 'AUTO' | 'ABSOLUTE'

## Remarks[​](#remarks "Direct link to Remarks")

Changing this property may cause the parent layer's size to change, since it will recalculate as if this child did not exist. It will also change this node's `x`, `y`, and `relativeTransform` properties.

- The default value of `"AUTO"` will layout this child according to auto-layout rules.
- Setting `"ABSOLUTE"` will take this child out of auto-layout flow, while still nesting inside the auto-layout frame. This allows explicitly setting `x`, `y`, `width`, and `height`. `"ABSOLUTE"` positioned nodes respect constraint settings.

Auto-layout frame absolutely positioned red circle at the top-right corner

```
const parentFrame = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
  
// Create a small red circle  
const ellipse = figma.createEllipse()  
ellipse.resize(20, 20)  
ellipse.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }}]  
parentFrame.appendChild(ellipse)  
parentFrame.clipsContent = false  
parentFrame.layoutMode = 'HORIZONTAL'  
  
// Enable absolute positioning so we can move the circle  
ellipse.layoutPositioning = 'ABSOLUTE'  
  
// Center the circle on the top-right corner of the frame  
ellipse.x = 90  
ellipse.y = -10  
  
// Make the circle stick to the top-right corner of the frame  
ellipse.constraints = { horizontal: 'MAX', vertical: 'MIN' }
```

[Previous

layoutMode](nodes-layoutmode.md)[Next

layoutSizingHorizontal](nodes-layoutsizinghorizontal.md)

- [Signature](#signature)
- [Remarks](#remarks)
