<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-findall -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- findAll

On this page

Searches this entire subtree (this node's children, its children's children, etc). Returns all nodes for which `callback` returns true.

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

### [findAll](nodes-findall.md)(callback?: (node: [SceneNode](../nodes.md#scene-node)) => boolean): [SceneNode](../nodes.md#scene-node)[]

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`. If this argument is omitted, `findAll` returns all nodes in the subtree.

## Remarks[​](#remarks "Direct link to Remarks")

Nodes are included in **back-to-front** order. Parents always appear before their children, and children appear in same relative order before their children, and children appear in same relative order as in the [`children`](nodes-children.md) array.

This traversal method is known as ["pre-order traversal"](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order_(NLR)).

Note that the node this method is called on is **not included**.

Example: find all nodes whose name is "Color":

```
const colors = figma.currentPage.findAll(n => n.name === "Color")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow.
If you only need to search immediate children, it is much faster to call `node.children.filter(callback)` or `node.findChildren(callback)`.
Please refer to our [recommendations](../../accessing-document.md#optimizing-traversals) for how to optimize document traversals.

[Previous

fills](nodes-fills.md)[Next

findAllWithCriteria](nodes-findallwithcriteria.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [callback](#callback)
- [Remarks](#remarks)
