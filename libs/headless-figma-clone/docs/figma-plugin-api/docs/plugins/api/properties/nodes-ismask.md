<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-ismask -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- isMask

On this page

Whether this node is a mask. A mask node masks its subsequent siblings.

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

### [isMask](nodes-ismask.md): boolean

## Remarks[​](#remarks "Direct link to Remarks")

Since a mask node masks all of its subsequent siblings, enabling `isMask` on a node that is not in a group-like container designed to stop mask propagation can have unintented consequences — that is, it may "mask" (often in practice, hide) more siblings than you intend. When enabling `isMask`, ensure you have contained its propagation propertly. ("Subsequent siblings" are siblings listed *after* this node in a `children` array in the plugin API; this corresponds to layers shown *above* this node in the layers panel.)

Example:

```
const rect = figma.createRectangle()  
const circleToMask = figma.createEllipse()  
const otherCircle1 = figma.createEllipse()  
const otherCircle2 = figma.createEllipse()  
  
// In the layers panel, this would look something like:  
// - otherCircle2  
// - otherCircle1  
// - circleToMask  
// - rect  
//  
// So if I enable `rect.isMask`, the rect will mask ALL other nodes,  
// because they are all siblings.  
//  
// If I only want `rect` to mask `circleToMask`, I should group  
// them first.  
figma.group([rect, circleToMask], figma.currentPage,  
            figma.currentPage.children.indexOf(circleToMask))  
rect.isMask = true  
  
// Now `rect` only masks its siblings above it in its group  
// (`circleToMask`) but not the circles outside of the group.  
// In the layers panel this would look like:  
// - otherCircle2  
// - otherCircle1  
// - Group  
//   - circleToMask [this is the only node masked by rect]  
//   - rect (isMask)
```

[Previous

insertChild](nodes-insertchild.md)[Next

itemReverseZIndex](nodes-itemreversezindex.md)

- [Signature](#signature)
- [Remarks](#remarks)
