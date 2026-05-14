<!-- source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findall -->

- Plugins
- [Node Types](../nodes.md)
- [DocumentNode](../DocumentNode.md)
- findAll

On this page

Searches the entire document tree. Returns all nodes for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](../figma.md#loadallpagesasync) to access this function.

Supported on:

- [DocumentNode](../DocumentNode.md)

## Signature[​](#signature "Direct link to Signature")

### [findAll](DocumentNode-findall.md)(callback?: (node: [PageNode](../PageNode.md) | [SceneNode](../nodes.md#scene-node)) => boolean): Array<[PageNode](../PageNode.md) | [SceneNode](../nodes.md#scene-node)>

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`. If this argument is omitted, `findAll` returns all nodes in the subtree.

## Remarks[​](#remarks "Direct link to Remarks")

Nodes are included in **back-to-front** order. Parents always appear before their children, and children appear in same relative order before their children, and children appear in same relative order as in the [`children`](nodes-children.md) array.

This traversal method is known as ["pre-order traversal"](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order_(NLR)).

Note that the root node itself is **not included**.

Example: find all nodes whose name is "Color":

```
await figma.loadAllPagesAsync() // call this once when the plugin runs  
const colors = figma.root.findAll(n => n.name === "Color")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow.
Please refer to our [recommendations](../../accessing-document.md#optimizing-traversals) for how to optimize document traversals.

[Previous

findChild](DocumentNode-findchild.md)[Next

findOne](DocumentNode-findone.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [callback](#callback)
- [Remarks](#remarks)
