<!-- source: https://developers.figma.com/docs/plugins/api/properties/TextNode-textautoresize -->

- Plugins
- [Node Types](../nodes.md)
- [TextNode](../TextNode.md)
- textAutoResize

On this page

The behavior of how the size of the text box adjusts to fit the characters. Setting this property requires the font the be loaded.

Supported on:

- [TextNode](../TextNode.md)

## Signature[​](#signature "Direct link to Signature")

### [textAutoResize](TextNode-textautoresize.md): 'NONE' | 'WIDTH\_AND\_HEIGHT' | 'HEIGHT' | 'TRUNCATE'

## Remarks[​](#remarks "Direct link to Remarks")

- "NONE": The size of the textbox is fixed and is independent of its content.
- "HEIGHT": The width of the textbox is fixed. Characters wrap to fit in the textbox. The height of the textbox automatically adjusts to fit its content.
- "WIDTH\_AND\_HEIGHT": Both the width and height of the textbox automatically adjusts to fit its content. Characters do not wrap.
- [DEPRECATED] "TRUNCATE": Like "NONE", but text that overflows the bounds of the text node will be truncated with an ellipsis. This value will be removed in the future - prefer reading from [`textTruncation`](TextNode-texttruncation.md) instead.

[Previous

TextNode](../TextNode.md)[Next

textTruncation](TextNode-texttruncation.md)

- [Signature](#signature)
- [Remarks](#remarks)
