<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-setslidegrid -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- setSlideGrid

On this page

**DEPRECATED:** Use [`figma.setCanvasGrid`](figma-setcanvasgrid.md) instead.

info

This API is only available in Figma Slides

## Signature[​](#signature "Direct link to Signature")

### [setSlideGrid](figma-setslidegrid.md)(slideGrid: Array<Array<[SlideNode](../SlideNode.md)>>): void

## Remarks[​](#remarks "Direct link to Remarks")

The order of Slides within a presentation is a key part of updating and editing a deck.
Using this method you can manipulate and reorder the grid.

For example:

```
const grid = figma.getSlideGrid()  
const [firstRow, ...rest] = grid  
  
// move the first row to the end  
figma.setSlideGrid([...rest, firstRow])
```

So long as all the Slides in the current grid are passed back to `setSlideGrid` the update will succeed.
Meaning, you can change the amount of rows as you please - flatten all to one row, explode to many rows, etc, and the method will handle all updates for you.

[Previous

getSlideGrid](figma-getslidegrid.md)[Next

getCanvasGrid](figma-getcanvasgrid.md)

- [Signature](#signature)
- [Remarks](#remarks)
