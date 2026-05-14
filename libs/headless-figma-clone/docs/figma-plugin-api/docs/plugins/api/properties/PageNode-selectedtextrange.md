<!-- source: https://developers.figma.com/docs/plugins/api/properties/PageNode-selectedtextrange -->

- Plugins
- [Node Types](../nodes.md)
- [PageNode](../PageNode.md)
- selectedTextRange

On this page

The current text node being edited, if any, and the text currently being selected within that text node.

Supported on:

- [PageNode](../PageNode.md)

## Signature[​](#signature "Direct link to Signature")

### [selectedTextRange](PageNode-selectedtextrange.md): { node: [TextNode](../TextNode.md); start: number; end: number } | null

## Remarks[​](#remarks "Direct link to Remarks")

This property will return `null` if there is no text node being edited. Setting this property to a `node` will enter text edit mode on that `node`. Leaving text edit mode will set this value to `null`.

When `start == end`, it means that no characters is currently selected -- i.e., there is just a cursor.

Changing `selectedTextRange` will trigger a `selectionchange` message.

[Previous

selection](PageNode-selection.md)[Next

flowStartingPoints](PageNode-flowstartingpoints.md)

- [Signature](#signature)
- [Remarks](#remarks)
