<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-resolvedvariablemodes -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- resolvedVariableModes

On this page

The resolved mode for this node for each variable collection in this file.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [EllipseNode](../EllipseNode.md)
- [EmbedNode](../EmbedNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [InteractiveSlideElementNode](../InteractiveSlideElementNode.md)
- [LineNode](../LineNode.md)
- [LinkUnfurlNode](../LinkUnfurlNode.md)
- [MediaNode](../MediaNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SliceNode](../SliceNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [StickyNode](../StickyNode.md)
- [TableNode](../TableNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)
- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### [resolvedVariableModes](nodes-resolvedvariablemodes.md): { [collectionId: string]: string }

## Remarks[​](#remarks "Direct link to Remarks")

The set of resolved modes on a node includes the explicitly set modes on the node, as well as the explicitly set modes on ancestors of the node. By default, nodes [automatically inherit](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables#Auto_mode) the modes of their parents.

explicitVariableModes vs resolvedVariableModes

```
// Create two collections with two modes each  
const collection1 = figma.variables.createVariableCollection("Collection 1")  
const collection1Mode1Id = collection1.modes[0].modeId  
const collection1Mode2Id = collection1.addMode('Mode 2')  
const collection2 = figma.variables.createVariableCollection("Collection 2")  
const collection2Mode1Id = collection2.modes[0].modeId  
const collection2Mode2Id = collection2.addMode('Mode 2')  
  
const parentFrame = figma.createFrame()  
const childFrame = figma.createFrame()  
parentFrame.appendChild(childFrame)  
  
parentFrame.setExplicitVariableModeForCollection(  
  collection1,  
  collection1Mode2Id  
)  
childFrame.setExplicitVariableModeForCollection(  
  collection2,  
  collection2Mode1Id  
)  
  
// Example output (only collection2 is present):  
// { 'VariableCollectionId:1:3': '1:2' }  
console.log(childFrame.explicitVariableModes);  
  
// Example output (both collections are present):  
// { 'VariableCollectionId:1:2': '1:1', 'VariableCollectionId:1:3': '1:2' }  
console.log(childFrame.resolvedVariableModes);
```

[Previous

resizeWithoutConstraints](nodes-resizewithoutconstraints.md)[Next

rotation](nodes-rotation.md)

- [Signature](#signature)
- [Remarks](#remarks)
