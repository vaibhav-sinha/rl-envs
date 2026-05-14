<!-- source: https://developers.figma.com/docs/plugins/updates/2025/11/06/version-1-update-120 -->

## New layout options for grid[​](#new-layout-options-for-grid "Direct link to New layout options for grid")

- Frames with [`layoutMode` `'GRID'`](../../../../api/properties/nodes-layoutmode.md) now support `'HUG'` for `layoutSizingHorizontal` and `layoutSizingVertical`.
- Frames with [`layoutMode` `'GRID'`](../../../../api/properties/nodes-layoutmode.md) also support `'HUG'` as a [`GridTrackSize`](../../../../api/GridTrackSize.md) `type` in the row and column sizes
- Frames with [`layoutMode` `'GRID'`](../../../../api/properties/nodes-layoutmode.md) now support values other than 1 for `'FLEX'` sized tracks in [`gridRowsSizes`](../../../../api/properties/nodes-gridrowsizes.md) and [`gridColumnsSizes`](../../../../api/properties/nodes-gridcolumnsizes.md). This corresponds to the [`fr` unit in CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout#the_fr_unit)
- **Note:** in Figma Design, when creating a new grid, the container and all rows and columns are automatically set to `HUG`, but in the Plugin API, new grids are `FIXED` and their tracks are `FLEX`.
- **Breaking change:** previously, calling the [`GridTrackSize`](../../../../api/GridTrackSize.md) setters with a value would set the track to `'FIXED'` if it was previously set as `'FLEX'`. Now, the `type` will only be automatically set to `'FIXED'` if the track was previously set to `'HUG'`

## Instance method deprecation[​](#instance-method-deprecation "Direct link to Instance method deprecation")

- The `resetOverrides` method on [InstanceNode](../../../../api/InstanceNode.md) is deprecated in favor of `removeOverrides`. This is a change in method name only.

[Newer post

Version 1, Update 121](../20/version-1-update-121.md)[Older post

Version 1, Update 119](../../10/23/version-1-update-119.md)
