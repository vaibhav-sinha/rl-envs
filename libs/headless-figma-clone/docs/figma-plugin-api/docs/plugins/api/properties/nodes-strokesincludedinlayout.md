<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-strokesincludedinlayout -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- strokesIncludedInLayout

On this page

Applicable only on auto-layout frames. Determines whether strokes are included in [layout calculations](https://help.figma.com/hc/en-us/articles/31289464393751-Use-the-horizontal-and-vertical-flows-in-auto-layout#01JT9NA4HVT02ZPE7BA86SFCD6). When true, auto-layout frames behave like css `box-sizing: border-box`.

Supported on:

- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [InferredAutoLayoutResult](../InferredAutoLayoutResult.md)
- [InstanceNode](../InstanceNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)

## Signature[​](#signature "Direct link to Signature")

### [strokesIncludedInLayout](nodes-strokesincludedinlayout.md): boolean

## Remarks[​](#remarks "Direct link to Remarks")

Auto-layout frame with strokes included in layout

```
const parentFrame = figma.createFrame()  
parentFrame.appendChild(figma.createFrame())  
parentFrame.appendChild(figma.createFrame())  
parentFrame.layoutMode = 'HORIZONTAL'  
// Let the height of the parent frame resize to fit the children  
parentFrame.counterAxisSizingMode = 'AUTO'  
  
// Thick stroke around parent frame to illustrate layout differences  
parentFrame.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }}]  
parentFrame.strokeWeight = 10  
  
// Parent frame (strokes overlap with children)  
// +--------------------------+  
// |+-----------++-----------+|  
// ||           ||           ||  
// ||  Child 1  ||  Child 2  ||  
// ||           ||           ||  
// |+-----------++-----------+|  
// +--------------------------+  
parentFrame.strokesIncludedInLayout = false  
  
// Parent frame (strokes do not overlap with children)  
// +--------------------------------+  
// |                                |  
// |   +-----------++-----------+   |  
// |   |           ||           |   |  
// |   |  Child 1  ||  Child 2  |   |  
// |   |           ||           |   |  
// |   +-----------++-----------+   |  
// |                                |  
// +--------------------------------+  
parentFrame.strokesIncludedInLayout = true
```

[Previous

strokes](nodes-strokes.md)[Next

stuckNodes](nodes-stucknodes.md)

- [Signature](#signature)
- [Remarks](#remarks)
