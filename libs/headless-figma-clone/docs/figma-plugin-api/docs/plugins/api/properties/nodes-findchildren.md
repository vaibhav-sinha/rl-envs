<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-findchildren -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- findChildren

On this page

Searches the immediate children of this node (i.e. not including the children's children). Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](../PageNode.md), you must first call [`loadAsync`](../PageNode.md#loadasync) to access this function.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [InstanceNode](../InstanceNode.md)
- [PageNode](../PageNode.md)
- [SectionNode](../SectionNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [TransformGroupNode](../TransformGroupNode.md)

## Signature[​](#signature "Direct link to Signature")

### [findChildren](nodes-findchildren.md)(callback?: (node: [SceneNode](../nodes.md#scene-node)) => boolean): [SceneNode](../nodes.md#scene-node)[]

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`. If this argument is omitted, `findChildren` returns `node.children`.

## Remarks[​](#remarks "Direct link to Remarks")

Example: find all frames that are immediate child of the current page.

```
const childFrames = figma.currentPage.findChildren(n => n.type === "FRAME")
```

[Previous

findChild](nodes-findchild.md)[Next

findOne](nodes-findone.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [callback](#callback)
- [Remarks](#remarks)
