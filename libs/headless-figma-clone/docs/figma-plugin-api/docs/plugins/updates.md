<!-- source: https://developers.figma.com/docs/plugins/updates -->

**Bug fixes**:

- Fix the type definition for [SlotNode](api/SlotNode.md) to include a `clone()` method.

## Dev Mode: focused node in Plugin API[​](#dev-mode-focused-node-in-plugin-api "Direct link to Dev Mode: focused node in Plugin API")

Plugins running in Figma Dev Mode can now read the node currently focused in the Dev Mode focus view. The existing [`figma.currentPage.focusedNode`](api/properties/PageNode-focusednode.md) property (already used in Figma Slides and Figma Buzz for the focused slide or asset) now returns that node in Dev Mode as well. See [Working in Dev Mode](working-in-dev-mode.md) for more on building plugins for Dev Mode.

## Expanded support for Figma Draw features[​](#expanded-support-for-figma-draw-features "Direct link to Expanded support for Figma Draw features")

You can now use the Plugin API to view and manipulate [Figma Draw](https://www.figma.com/draw/) features, including:

- Creating and editing text on a path nodes
- Viewing and adding transforms in transform groups
- Viewing and adding stretch brush, scatter brush, and dynamic strokes
- Modifying stroke width profiles to create custom variable width strokes or using preset stroke width profiles

We've also updated the documentation around setting [pattern fills and strokes](adding-pattern-fills-and-strokes.md).

### New types[​](#new-types "Direct link to New types")

- [`TextPathStartData`](api/TextPathStartData.md): Data defining the starting position of text on a path
- [`TransformModifier`](api/TransformModifier.md): A modifier that can be applied to a transform group
- [`ComplexStrokeProperties`](api/ComplexStrokeProperties.md): Stroke properties describing stretch brushes, scatter brushes, and dynamic strokes
- [`VariableWidthStrokeProperties`](api/VariableWidthStrokeProperties.md): Points that define the width profile of variable width strokes

### New methods[​](#new-methods "Direct link to New methods")

- [`figma.createTextPath(node, startSegment, startPosition)`](api/properties/figma-createtextpath.md): Create a text on a path node from a vector node.
- [`figma.transformGroup(nodes, parent, index, transformModifiers)`](api/properties/figma-transformgroup.md): Wrap nodes in a transform group with specified transform modifiers.
- [`figma.loadBrushesAsync(brushType)`](api/properties/figma-loadbrushesasync.md): Load the first-party brushes of the specified type (stretch or scatter).
- [`node.setFillsAsync(fills)`](api/node-properties.md#setfillsasync): Supports setting pattern fills.
- [`node.setStrokesAsync(strokes)`](api/node-properties.md#setstrokesasync): Supports setting pattern strokes.

### New properties[​](#new-properties "Direct link to New properties")

- [`textOnPathNode.textPathStartData`](api/TextPathNode.md#text-path-node-properties): Gets and sets the starting position data for text on a path node.
- [`transformGroupNode.transformModifiers`](api/TransformGroupNode.md#transform-group-properties): Gets and sets the transform modifiers applied to a transform group.
- [`node.complexStrokeProperties`](api/node-properties.md#complexstrokeproperties): Gets and sets the complex stroke properties (brush or dynamic stroke properties) of a node, if any.
- [`node.variableWidthStrokeProperties`](api/node-properties.md#variablewidthstrokeproperties): Gets and sets the variable width stroke properties of a node, if any.

- Added a [rootVariableCollectionId](api/ExtendedVariableCollection.md#rootvariablecollectionid) property to extended collections that return the node ID of the top-most ancestor
- Fixed [plugin manifest](manifest.md#editortype) documentation to list `slides` and `buzz` as valid `editorType` values

## Extended variable collections (Enterprise only)[​](#extended-variable-collections-enterprise-only "Direct link to Extended variable collections (Enterprise only)")

**Extended variable collections** enable theming for variables. When you extend a collection, the extension inherits all modes and variables from its parent collection. You can then override variable values in the extended collection to create theme-specific variations while maintaining a single source of truth.

### New type[​](#new-type "Direct link to New type")

- [`ExtendedVariableCollection`](api/ExtendedVariableCollection.md): A variable collection that extends another collection

### New methods[​](#new-methods "Direct link to New methods")

- [`figma.variables.extendLibraryCollectionByKeyAsync(collectionKey, name)`](api/figma-variables.md#extendlibrarycollectionbykeyasync): Create an extended collection from a library or local variable collection
- [`variableCollection.extend(name)`](api/VariableCollection.md#extend): Create an extended collection from a local variable collection
- [`variable.valuesByModeForCollectionAsync(collection)`](api/Variable.md#valuesbymodeforcollectionasync): Get variable values for a specific collection, including overrides in extended collections
- [`variable.removeOverrideForMode(extendedModeId)`](api/Variable.md#removeoverrideformode): Remove an override for a specific mode
- [`extendedVariableCollection.removeOverridesForVariable(variableId)`](api/ExtendedVariableCollection.md#removeoverridesforvariable): Remove all overrides for a variable

### New properties[​](#new-properties "Direct link to New properties")

- [`extendedVariableCollection.variableOverrides`](api/ExtendedVariableCollection.md#variableoverrides): A map of all overridden variable values in the extended collection
- `mode.parentModeId`: For modes in extended collections, references the corresponding mode in the parent collection

### Updated behavior[​](#updated-behavior "Direct link to Updated behavior")

- [`variable.setValueForMode(modeId, value)`](api/Variable.md#setvalueformode): When the `modeId` belongs to an extended collection, the value will be set as an override on the extension

For examples and more details, see [Working with Variables](working-with-variables.md#extended-variable-collections).

## New layout options for grid[​](#new-layout-options-for-grid "Direct link to New layout options for grid")

- Frames with [`layoutMode` `'GRID'`](api/properties/nodes-layoutmode.md) now support `'HUG'` for `layoutSizingHorizontal` and `layoutSizingVertical`.
- Frames with [`layoutMode` `'GRID'`](api/properties/nodes-layoutmode.md) also support `'HUG'` as a [`GridTrackSize`](api/GridTrackSize.md) `type` in the row and column sizes
- Frames with [`layoutMode` `'GRID'`](api/properties/nodes-layoutmode.md) now support values other than 1 for `'FLEX'` sized tracks in [`gridRowsSizes`](api/properties/nodes-gridrowsizes.md) and [`gridColumnsSizes`](api/properties/nodes-gridcolumnsizes.md). This corresponds to the [`fr` unit in CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout#the_fr_unit)
- **Note:** in Figma Design, when creating a new grid, the container and all rows and columns are automatically set to `HUG`, but in the Plugin API, new grids are `FIXED` and their tracks are `FLEX`.
- **Breaking change:** previously, calling the [`GridTrackSize`](api/GridTrackSize.md) setters with a value would set the track to `'FIXED'` if it was previously set as `'FLEX'`. Now, the `type` will only be automatically set to `'FIXED'` if the track was previously set to `'HUG'`

## Instance method deprecation[​](#instance-method-deprecation "Direct link to Instance method deprecation")

- The `resetOverrides` method on [InstanceNode](api/InstanceNode.md) is deprecated in favor of `removeOverrides`. This is a change in method name only.

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

For more information, see the [Working in Buzz](working-in-buzz.md) guide.

- Added support for `fontStyle` in [getStyledTextSegments()](api/properties/TextNode-getstyledtextsegments.md)

- Added grid gap types to [VariableBindableNodeField](api/VariableBindableNodeField.md)
- Added grid types to [AnnotationProperty](api/AnnotationProperty.md)

- Added the `visible` property to the [Noise](api/Effect.md#noiseeffect) and [Texture](api/Effect.md#textureeffect) effect types.
- Added the `boundVariables` property to [Noise](api/Effect.md#noiseeffect) and [Texture](api/Effect.md#textureeffect) effect types to prevent validation errors on write. Note that binding variables for Noise and Texture effects is not yet supported.
- Added a new [Glass](api/Effect.md#glasseffect) effect type in beta. Note that the effect is only supported on Frames at this time, and binding variables is not yet supported.
- Fixed [`GridTrackSize`](api/GridTrackSize.md) to properly handle `value` as optional.

[Older entries](updates/page/2.md)
