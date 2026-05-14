<!-- source: https://developers.figma.com/docs/plugins/api/figma-viewport -->

- Plugins
- [Global Objects](global-objects.md)
- [figma](figma.md)
- viewport

These are methods and properties available on the `figma.viewport` global object. It represents the area of the canvas that is currently visible on-screen, commonly referred to as the **viewport**. The position of the viewport is represented via its center coordinate and zoom level.

### center: [Vector](Vector.md)

Center of the the current page that is currently visible on screen.

---

### [zoom](properties/figma-viewport-zoom.md): number

Zoom level. A value of 1.0 means 100% zoom, 0.5 means 50% zoom.

[View more →](properties/figma-viewport-zoom.md)

---

### scrollAndZoomIntoView(nodes: ReadonlyArray<[BaseNode](nodes.md#base-node)>): void

Automatically sets the viewport coordinates such that the nodes are visible on screen. It is the equivalent of pressing Shift-1.

---

### bounds: [Rect](Rect.md) [readonly]

The bounds of the viewport of the page that is currently visible on screen. The (x, y) corresponds to the top-left of the screen. User actions such as resizing the window or showing/hiding the rulers/UI will change the bounds of the viewport.

---

### [slidesView](properties/figma-viewport-slidesview.md): 'grid' | 'single-slide'

info

This API is only available in Figma Slides

[View more →](properties/figma-viewport-slidesview.md)

---

### [canvasView](properties/figma-viewport-canvasview.md): 'grid' | 'single-asset'

info

This API is only available in Figma Slides and Figma Buzz

[View more →](properties/figma-viewport-canvasview.md)

---

[Previous

timer](figma-timer.md)[Next

zoom](properties/figma-viewport-zoom.md)
