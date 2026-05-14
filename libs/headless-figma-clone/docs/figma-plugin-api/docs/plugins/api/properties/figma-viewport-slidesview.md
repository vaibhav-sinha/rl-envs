<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-viewport-slidesview -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- [viewport](../figma-viewport.md)
- slidesView

On this page

info

This API is only available in Figma Slides

## Signature[​](#signature "Direct link to Signature")

### [slidesView](figma-viewport-slidesview.md): 'grid' | 'single-slide'

## Remarks[​](#remarks "Direct link to Remarks")

The viewport mode within the Slides UI: In Single Slide View, the viewport is zoomed into the current slide, and we only render that
one slide. In Grid View, the viewport is zoomed out to show the entire slide grid.

You can access the current view:

```
const currentView = figma.viewport.slidesView
```

And you can set the view:

```
figma.viewport.slidesView = 'single-slide'
```

### A Note About Single Slide View:[​](#a-note-about-single-slide-view "Direct link to A Note About Single Slide View:")

We have updated all of the create methods (`figma.createRectangle()`, `figma.createLine()`, etc) so that when the Figma Slides file is in Single Slide View,
they append that node to the focused slide instead of to the canvas. This is to ensure that the node you are creating is viewable by the current user and
not hidden off to the side of the larger grid view.

[Previous

zoom](figma-viewport-zoom.md)[Next

canvasView](figma-viewport-canvasview.md)

- [Signature](#signature)
- [Remarks](#remarks)
  - [A Note About Single Slide View:](#a-note-about-single-slide-view)
