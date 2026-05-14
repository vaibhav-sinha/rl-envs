<!-- source: https://developers.figma.com/docs/plugins/api/properties/PageNode-focusednode -->

- Plugins
- [Node Types](../nodes.md)
- [PageNode](../PageNode.md)
- focusedNode

On this page

info

This API is only available in Figma Slides, Figma Buzz, and Dev Mode.

For Figma Slides and Figma Buzz:
When in Asset View, this is the focused slide or asset.

For Dev Mode:
This is the node currently focused in Dev Mode focus view. This property is read-only in Dev Mode.

Supported on:

- [PageNode](../PageNode.md)

## Signature[​](#signature "Direct link to Signature")

### [focusedNode](PageNode-focusednode.md): [SceneNode](../nodes.md#scene-node) | null

## Remarks[​](#remarks "Direct link to Remarks")

In Figma Slides and Figma Buzz, you can also set this via:

```
figma.currentPage.focusedNode = node
```

[Previous

focusedSlide](PageNode-focusedslide.md)[Next

PolygonNode](../PolygonNode.md)

- [Signature](#signature)
- [Remarks](#remarks)
