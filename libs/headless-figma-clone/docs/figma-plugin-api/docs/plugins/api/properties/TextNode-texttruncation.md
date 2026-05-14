<!-- source: https://developers.figma.com/docs/plugins/api/properties/TextNode-texttruncation -->

- Plugins
- [Node Types](../nodes.md)
- [TextNode](../TextNode.md)
- textTruncation

On this page

Whether this text node will truncate with an ellipsis when the text node size is smaller than the text inside.

Supported on:

- [TextNode](../TextNode.md)

## Signature[​](#signature "Direct link to Signature")

### [textTruncation](TextNode-texttruncation.md): 'DISABLED' | 'ENDING'

## Remarks[​](#remarks "Direct link to Remarks")

When [`textAutoResize`](TextNode-textautoresize.md) is set to `"NONE"`, the text will truncate when the fixed size is smaller than the text inside. When it is `"HEIGHT"` or `"WIDTH_AND_HEIGHT"`, truncation will only occur if used in conjunction with [`maxHeight`](../node-properties.md#maxheight) or [`maxLines`](TextNode-maxlines.md).

[Previous

textAutoResize](TextNode-textautoresize.md)[Next

maxLines](TextNode-maxlines.md)

- [Signature](#signature)
- [Remarks](#remarks)
