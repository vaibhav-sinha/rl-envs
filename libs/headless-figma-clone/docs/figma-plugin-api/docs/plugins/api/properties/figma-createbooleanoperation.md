<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createbooleanoperation -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createBooleanOperation

On this page

**DEPRECATED:** Use [`figma.union`](../figma.md#union), [`figma.subtract`](../figma.md#subtract), [`figma.intersect`](../figma.md#intersect), [`figma.exclude`](../figma.md#exclude) instead.

## Signature[​](#signature "Direct link to Signature")

### [createBooleanOperation](figma-createbooleanoperation.md)(): [BooleanOperationNode](../BooleanOperationNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

Using this function is not recommended because empty boolean operation nodes can have surprising, unpredictable behavior. It will eventually be remove. Use one of the functions listed above instead.

Creates a new, empty boolean operation node. The particular kind of operation is set via `.booleanOperation`. By default, the value is `"UNION"`.

This snippet, for example, creates a boolean operation node that is a union of a rectangle and an ellipse.

Create a boolean operation node

```
const node = figma.createBooleanOperation()  
node.appendChild(figma.createRectangle())  
node.appendChild(figma.createEllipse())
```

[Previous

createNodeFromJSXAsync](figma-createnodefromjsxasync.md)[Next

loadFontAsync](figma-loadfontasync.md)

- [Signature](#signature)
- [Remarks](#remarks)
