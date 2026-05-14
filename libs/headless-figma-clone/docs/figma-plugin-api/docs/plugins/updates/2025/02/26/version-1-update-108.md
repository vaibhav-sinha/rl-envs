<!-- source: https://developers.figma.com/docs/plugins/updates/2025/02/26/version-1-update-108 -->

To help developers enhance decks and presentations, Figma Slides now supports plugins! You can use the new API features to effectively enable users to create beautiful, functional slide decks.

New:

- Figma's Plugin API typings now support Figma Slides.
- Figma Slides has four new node types: [SLIDE](../../../../working-in-slides.md#slide), [SLIDE\_ROW](../../../../working-in-slides.md#slide_row), [SLIDE\_GRID](../../../../working-in-slides.md#slide_grid), and [INTERACTIVE\_SLIDE\_ELEMENT](../../../../working-in-slides.md#interactive_slide_element).
- `figma.editorType` can now return `slides` when a plugin is running in Figma Slides.
- `figma.viewport.slidesMode` can be used to toggle between `grid` view or `single-slide` view.
- `figma.currentPage.focusedSlide` identifies the slide currently focused on in the interface.
- `figma.getSlideGrid()` returns the slide grid, a 2D representation of slides within a deck.
- `figma.setSlideGrid()` is used to reorder slides in the grid.
- `getSlideTransition()` gets the current transition for a given `SLIDE` node.
- `setSlideTransition()` is used to set the transition for a given `SLIDE` node.

For more information, see the [Working in Slides](../../../../working-in-slides.md) guide.

[Newer post

Updates for 2025-03-12](../../03/12/update.md)[Older post

Version 1, Update 107](../13/version-1-update-107.md)
