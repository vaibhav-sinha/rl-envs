<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-findwidgetnodesbywidgetid -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- findWidgetNodesByWidgetId

On this page

Searches this entire subtree (this node's children, its children's children, etc). Returns all widget nodes that match the provided `widgetId`.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](../PageNode.md), you must first call [`loadAsync`](../PageNode.md#loadasync) to access this function.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [InstanceNode](../InstanceNode.md)
- [PageNode](../PageNode.md)
- [SectionNode](../SectionNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [TransformGroupNode](../TransformGroupNode.md)

## Signature[​](#signature "Direct link to Signature")

### [findWidgetNodesByWidgetId](nodes-findwidgetnodesbywidgetid.md)(widgetId: string): Array<[WidgetNode](../WidgetNode.md)>

## Parameters[​](#parameters "Direct link to Parameters")

### widgetId[​](#widgetid "Direct link to widgetId")

The widget ID to search for, which represents unique identifier for the widget.

## Remarks[​](#remarks "Direct link to Remarks")

`node.widgetId` is not to be confused with `node.id`, which is the unique identifier for the node on the canvas. In other words, if you clone a widget, the cloned widget will have a matching `widgetId` but a different `id`.

[Previous

findOne](nodes-findone.md)[Next

getDevResourcesAsync](nodes-getdevresourcesasync.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [widgetId](#widgetid)
- [Remarks](#remarks)
