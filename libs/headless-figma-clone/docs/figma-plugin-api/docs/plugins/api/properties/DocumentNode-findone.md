<!-- source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findone -->

- Plugins
- [Node Types](../nodes.md)
- [DocumentNode](../DocumentNode.md)
- findOne

On this page

Searches this entire page (this node's children, its children's children, etc.). Returns the first node for which `callback` returns true.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](../figma.md#loadallpagesasync) to access this function.

Supported on:

- [DocumentNode](../DocumentNode.md)

## Signature[​](#signature "Direct link to Signature")

### [findOne](DocumentNode-findone.md)(callback: (node: [PageNode](../PageNode.md) | [SceneNode](../nodes.md#scene-node)) => boolean): [PageNode](../PageNode.md) | [SceneNode](../nodes.md#scene-node) | null

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`.

## Remarks[​](#remarks "Direct link to Remarks")

This function returns `null` if no matching node is found. The traversal order is the same as in [`findAll`](nodes-findall.md).

Note that the root node itself is **not included**.

Example: find one node whose name is "Template":

```
await figma.loadAllPagesAsync() // call this once when the plugin runs  
const template = figma.root.findOne(n => n.name === "Template")
```

caution

⚠ Large documents in Figma can have tens of thousands of nodes. Be careful using this function as it could be very slow.
Please refer to our [recommendations](../../accessing-document.md#optimizing-traversals) for how to optimize document traversals.

[Previous

findAll](DocumentNode-findall.md)[Next

findWidgetNodesByWidgetId](DocumentNode-findwidgetnodesbywidgetid.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [callback](#callback)
- [Remarks](#remarks)
