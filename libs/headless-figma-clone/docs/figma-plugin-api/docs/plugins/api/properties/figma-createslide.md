<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-createslide -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- createSlide

On this page

info

This API is only available in Figma Slides

## Signature[​](#signature "Direct link to Signature")

### [createSlide](figma-createslide.md)(row?: number, col?: number): [SlideNode](../SlideNode.md)

## Remarks[​](#remarks "Direct link to Remarks")

By default, the slide gets appended to the end of the presentation (the last child in the last Slide Row).

Create a slide

```
const slide = figma.createSlide()
```

To specify a position in the Slide Grid, pass a row and column index to the function.

Create a slide at index 0, 0

```
const slide = figma.createSlide(0, 0)
```

[Previous

createSlice](figma-createslice.md)[Next

createSlideRow](figma-createsliderow.md)

- [Signature](#signature)
- [Remarks](#remarks)
