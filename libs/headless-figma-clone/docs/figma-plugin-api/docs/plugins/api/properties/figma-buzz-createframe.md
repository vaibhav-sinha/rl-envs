<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-buzz-createframe -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [buzz](../figma-buzz.md)
- createFrame

On this page

Creates a new frame in Buzz, optionally positioned at specific canvas coordinates.

## Signature[​](#signature "Direct link to Signature")

### [createFrame](figma-buzz-createframe.md)(rowIndex?: number, columnIndex?: number): [FrameNode](../FrameNode.md)

## Parameters[​](#parameters "Direct link to Parameters")

### rowIndex[​](#rowindex "Direct link to rowIndex")

The row position on the canvas grid (optional)

### columnIndex[​](#columnindex "Direct link to columnIndex")

The column position on the canvas grid (optional)

## Remarks[​](#remarks "Direct link to Remarks")

If no rowIndex and columnIndex are specified, the new frame will be created at the end of the canvas grid.

[Previous

buzz](../figma-buzz.md)[Next

createInstance](figma-buzz-createinstance.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [rowIndex](#rowindex)
  - [columnIndex](#columnindex)
- [Remarks](#remarks)
