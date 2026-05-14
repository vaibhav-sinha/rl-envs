<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-setgridchildposition -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- setGridChildPosition

On this page

Applicable only on direct children of 'GRID' auto-layout frames. Sets the position of the node

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

### [setGridChildPosition](nodes-setgridchildposition.md)(rowIndex: number, columnIndex: number): void

## Remarks[​](#remarks "Direct link to Remarks")

This method sets the position of the node within the grid based on the specified row and column indices.
The row and column indices are 0-based, where 0 is the top row in the grid, and 0 is the left-most column in the grid.
If the specified row or column index is out of bounds, it will throw an error.
If the specified row or column index is occupied by another node, it will throw an error.

Setting the position of a node in a grid

```
const grid = figma.createFrame()  
grid.layoutMode = 'GRID'  
grid.gridRowCount = 3  
grid.gridColumnCount = 3  
const child1 = figma.createFrame()  
const child2 = figma.createFrame()  
const child2 = figma.createFrame()  
// + --- + --- + --- +  
// |  1  |  2  |  3  |  
// + --- + --- + --- +  
// |     |     |     |  
// + --- + --- + --- +  
// |     |     |     |  
// + --- + --- + --- +  
  
// If calling `appendChild` instead of [`appendChildAt`](/api/properties/nodes-appendchildat.md), nodes will be added to the first available position in the grid.  
grid.appendChild(child1)  
grid.appendChild(child2)  
grid.appendChild(child3)  
// Move the children to specific grid positions  
child2.setGridPosition(1, 0)  
child3.setGridPosition(2, 1)  
// + --- + --- + --- +  
// |  1  |     |     |  
// + --- + --- + --- +  
// |  2  |     |     |  
// + --- + --- + --- +  
// |     |  3  |     |  
// + --- + --- + --- +
```

[Previous

setExplicitVariableModeForCollection](ExplicitVariableModesMixin-setexplicitvariablemodeforcollection.md)[Next

setPluginData](nodes-setplugindata.md)

- [Signature](#signature)
- [Remarks](#remarks)
