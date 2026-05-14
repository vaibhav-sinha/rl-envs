<!-- source: https://developers.figma.com/docs/plugins/api/properties/DocumentNode-findwidgetnodesbywidgetid -->

- Plugins
- [Node Types](../nodes.md)
- [DocumentNode](../DocumentNode.md)
- findWidgetNodesByWidgetId

On this page

Searches the entire document tree. Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, you must first call [`figma.loadAllPagesAsync`](../figma.md#loadallpagesasync) to access this function.

Supported on:

- [DocumentNode](../DocumentNode.md)

## Signature[​](#signature "Direct link to Signature")

### [findWidgetNodesByWidgetId](DocumentNode-findwidgetnodesbywidgetid.md)(widgetId: string): Array<[WidgetNode](../WidgetNode.md)>

## Parameters[​](#parameters "Direct link to Parameters")

### widgetId[​](#widgetid "Direct link to widgetId")

The widget ID to search for, which represents unique identifier for the widget.

## Remarks[​](#remarks "Direct link to Remarks")

`node.widgetId` is not to be confused with `node.id`, which is the unique identifier for the node on the canvas. In other words, if you clone a widget, the cloned widget will have a matching `widgetId` but a different `id`.

[Previous

findOne](DocumentNode-findone.md)[Next

EllipseNode](../EllipseNode.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [widgetId](#widgetid)
- [Remarks](#remarks)
