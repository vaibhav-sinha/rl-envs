<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-setcanvasgrid -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- setCanvasGrid

On this page

Sets the canvas grid layout, reorganizing nodes in the canvas.

info

This API is only available in Figma Slides and Figma Buzz

## Signature[​](#signature "Direct link to Signature")

### [setCanvasGrid](figma-setcanvasgrid.md)(canvasGrid: Array<Array<[SceneNode](../nodes.md#scene-node)>>): void

## Parameters[​](#parameters "Direct link to Parameters")

### canvasGrid[​](#canvasgrid "Direct link to canvasGrid")

A 2D array representing the new canvas grid layout

## Remarks[​](#remarks "Direct link to Remarks")

This allows you to programmatically rearrange the layout of slides or assets in the canvas grid.
All nodes in the current grid must be included in the new layout.

For example:

```
const grid = figma.getCanvasGrid()  
const [firstRow, ...rest] = grid  
  
// move the first row to the end  
figma.setCanvasGrid([...rest, firstRow])
```

[Previous

getCanvasGrid](figma-getcanvasgrid.md)[Next

createCanvasRow](figma-createcanvasrow.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [canvasGrid](#canvasgrid)
- [Remarks](#remarks)
