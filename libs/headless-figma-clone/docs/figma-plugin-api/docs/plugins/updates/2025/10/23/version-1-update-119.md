<!-- source: https://developers.figma.com/docs/plugins/updates/2025/10/23/version-1-update-119 -->

## Plugins in Buzz[​](#plugins-in-buzz "Direct link to Plugins in Buzz")

Figma Buzz now supports plugins! With the new API features, you can enable users to create, customize, and manage marketing assets like social posts, digital ads, and more at scale.

New:

- Figma's Plugin API typings now support Figma Buzz.
- `figma.editorType` can now return `buzz` when a plugin is running in Figma Buzz.
- `figma.buzz` provides access to the Buzz API with methods for creating and managing media assets.
- `figma.buzz.createFrame()` creates frames optimized for the canvas grid layout.
- `figma.buzz.getBuzzAssetTypeForNode()` and `figma.buzz.setBuzzAssetTypeForNode()` allow you to work with 42+ predefined asset types for platforms like Instagram, LinkedIn, Twitter, and Facebook.
- `figma.buzz.getTextContent()` and `figma.buzz.getMediaContent()` extract dynamic content fields from templates for easy customization.
- `figma.buzz.smartResize()` intelligently resizes assets for different platform requirements while preserving design integrity.
- `figma.viewport.canvasView` can be used to toggle between `grid` view or `single-asset` view.
- `figma.currentPage.focusedNode` identifies the asset currently focused on in the interface.
- `figma.getCanvasGrid()` returns the canvas grid, a 2D representation of assets within the canvas.
- `figma.setCanvasGrid()` is used to reorder assets in the grid.
- `figma.createCanvasRow()` creates a new row in the canvas grid.
- `figma.moveNodesToCoord()` moves nodes to specific positions in the canvas grid.

For more information, see the [Working in Buzz](../../../../working-in-buzz.md) guide.

[Newer post

Version 1, Update 120](../../11/06/version-1-update-120.md)[Older post

Version 1, Update 118](../09/version-1-update-118.md)
