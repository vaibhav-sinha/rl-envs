<!-- source: https://developers.figma.com/docs/plugins/api/properties/TableNode-moverow -->

- Plugins
- [Node Types](../nodes.md)
- [TableNode](../TableNode.md)
- moveRow

On this page

Moves the row from the start index to the destination index.

Supported on:

- [TableNode](../TableNode.md)

## Signature[​](#signature "Direct link to Signature")

### moveRow(fromIndex: number, toIndex: number): void

## Parameters[​](#parameters "Direct link to Parameters")

### fromIndex[​](#fromindex "Direct link to fromIndex")

Index of the row to move. Must satisfy `0 <= rowIndex < numRows`.

### toIndex[​](#toindex "Direct link to toIndex")

Index that specifies where the row will be moved before. Must satisfy `0 <= rowIndex < numRows`.

[Previous

removeColumn](TableNode-removecolumn.md)[Next

moveColumn](TableNode-movecolumn.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [fromIndex](#fromindex)
  - [toIndex](#toindex)
