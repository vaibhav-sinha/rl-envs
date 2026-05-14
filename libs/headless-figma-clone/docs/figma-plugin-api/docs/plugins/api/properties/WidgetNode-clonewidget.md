<!-- source: https://developers.figma.com/docs/plugins/api/properties/WidgetNode-clonewidget -->

- Plugins
- [Node Types](../nodes.md)
- [WidgetNode](../WidgetNode.md)
- cloneWidget

On this page

Create a copy of this WidgetNode while overriding specific synced state & synced map values for the widget.
Overrides are only applied if a widget is cloning itself or other widgets created by the same `manifest.id`.

Supported on:

- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### cloneWidget(syncedStateOverrides: { [name: string]: any }, syncedMapOverrides?: { [mapName: string]: { [key: string]: any } }): [WidgetNode](../WidgetNode.md)

## Parameters[​](#parameters "Direct link to Parameters")

### syncedStateOverrides[​](#syncedstateoverrides "Direct link to syncedStateOverrides")

synced state values to override in the new WidgetNode.

Each key/value pair in this object will override the corresponding `useSyncedState(<key>)` value.

Similar to [`WidgetNode.clone`](../WidgetNode.md#clone), the duplicate will be parented under
`figma.currentPage`. If you are relying on the x, y or the relativeTransform of the original widget, make sure
to account for the case where the original widget is parented under a different node (eg. a section).

### syncedMapOverrides[​](#syncedmapoverrides "Direct link to syncedMapOverrides")

synced maps to override in the new WidgetNode.

Each key in this object will override the entire corresponding `useSyncedMap(<key>)` value if specified.

caution

NOTE: every key in `syncedMapOverrides` will override the entire corresponding synced map, deleting all existing keys in the map. If you wish to preserve some of the keys in the map, you'll need to explicitly specify them in the override.

For more information, check out [this page in our widget documentation](https://figma.com/widget-docs/managing-multiple-widgets#widgetnodeclonewidget).

[Previous

WidgetNode](../WidgetNode.md)[Next

setWidgetSyncedState](WidgetNode-setwidgetsyncedstate.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [syncedStateOverrides](#syncedstateoverrides)
  - [syncedMapOverrides](#syncedmapoverrides)
