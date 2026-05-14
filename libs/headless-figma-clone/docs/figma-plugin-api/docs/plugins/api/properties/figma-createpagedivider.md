<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createpagedivider -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createPageDivider

On this page

Creates a new page divider, appended to the document's list of children. A page divider is a [`PageNode`](../PageNode.md) with `isPageDivider` true.

## Signature[​](#signature "Direct link to Signature")

### [createPageDivider](figma-createpagedivider.md)(dividerName?: string): [PageNode](../PageNode.md)

## Parameters[​](#parameters "Direct link to Parameters")

### dividerName[​](#dividername "Direct link to dividerName")

An optional argument to specify the name of the page divider node. It won't change how the page divider appears in the UI, but it specifies the name of the underlying node. The dividerName must be a page divider name (all asterisks, all en dashes, all em dashes, or all spaces). If no dividerName is specified, the default name for the created page divider node is "---".

## Remarks[​](#remarks "Direct link to Remarks")

A page divider is always the child of the document node and cannot have any children.

[Previous

createPage](figma-createpage.md)[Next

createSlice](figma-createslice.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [dividerName](#dividername)
- [Remarks](#remarks)
