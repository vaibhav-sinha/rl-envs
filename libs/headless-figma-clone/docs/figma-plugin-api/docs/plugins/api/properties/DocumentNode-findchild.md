<!-- source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findchild -->

- Plugins
- [Node Types](../nodes.md)
- [DocumentNode](../DocumentNode.md)
- findChild

On this page

Searches the immediate children of this node (i.e. all page nodes, not including their children). Returns the first page for which `callback` returns true.

Supported on:

- [DocumentNode](../DocumentNode.md)

## Signature[​](#signature "Direct link to Signature")

### [findChild](DocumentNode-findchild.md)(callback: (node: [PageNode](../PageNode.md)) => boolean): [PageNode](../PageNode.md) | null

## Parameters[​](#parameters "Direct link to Parameters")

### callback[​](#callback "Direct link to callback")

A function that evaluates whether to return the provided `node`.

## Remarks[​](#remarks "Direct link to Remarks")

This function returns `null` if no matching node is found.

Example: find the first page matching a certain name scheme

```
const firstTemplate = figma.root.findChild(n => n.name.includes("template"))
```

[Previous

findChildren](DocumentNode-findchildren.md)[Next

findAll](DocumentNode-findall.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [callback](#callback)
- [Remarks](#remarks)
