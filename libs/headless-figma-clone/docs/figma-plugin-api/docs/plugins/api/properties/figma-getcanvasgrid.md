<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-getcanvasgrid -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- getCanvasGrid

On this page

Gets the current canvas grid layout as a 2D array of nodes.

info

This API is only available in Figma Slides and Figma Buzz

## Signature[​](#signature "Direct link to Signature")

### [getCanvasGrid](figma-getcanvasgrid.md)(): Array<Array<[SceneNode](../nodes.md#scene-node)>>

## Remarks[​](#remarks "Direct link to Remarks")

The canvas grid represents the organizational structure of assets in Slides and Buzz,
where each position can contain a node (slide or asset).

To visualize the nodes in the canvas grid in a 2D array, you can call this function.

```
const grid = figma.getCanvasGrid()
```

[Previous

setSlideGrid](figma-setslidegrid.md)[Next

setCanvasGrid](figma-setcanvasgrid.md)

- [Signature](#signature)
- [Remarks](#remarks)
