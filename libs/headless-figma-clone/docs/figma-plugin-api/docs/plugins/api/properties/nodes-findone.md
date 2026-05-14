<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-findone -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- findOne

On this page

Searches this entire subtree (this node's children, its children's children, etc). Returns the first node for which `callback` returns true.

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

### [findOne](nodes-findone.md)(callback: (node: [SceneNode](../nodes.md#scene-node)) => boolean): [SceneNode](../nodes.md#scene-node) | null

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`.

## Remarks[​](#remarks "Direct link to Remarks")

This function returns `null` if no matching node is found. The traversal order is the same as in [`findAll`](nodes-findall.md).

Note that the node this method is called on is **not included**.

Example: find one node whose name is "Template":

```
const template = figma.currentPage.findOne(n => n.name === "Template")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow.
If you only need to search immediate children, it is much faster to call `node.children.find(callback)` or `node.findChild(callback)`.
Please refer to our [recommendations](../../accessing-document.md#optimizing-traversals) for how to optimize document traversals.

[Previous

findChildren](nodes-findchildren.md)[Next

findWidgetNodesByWidgetId](nodes-findwidgetnodesbywidgetid.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [callback](#callback)
- [Remarks](#remarks)
