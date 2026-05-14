<!-- source: https://developers.figma.com/docs/plugins/api/properties/PageNode-on -->

- Plugins
- [Node Types](../nodes.md)
- [PageNode](../PageNode.md)
- on

On this page

Registers a callback that will be invoked when an event occurs on the page. Current supported events are:

- `"nodechange"`: Emitted when a node is added, removed, or updated.

Supported on:

- [PageNode](../PageNode.md)

## Signature[​](#signature "Direct link to Signature")

### [on](PageNode-on.md)(type: 'nodechange', callback: (event: [NodeChangeEvent](../NodeChangeEvent.md)) => void): void

## Parameters[​](#parameters "Direct link to Parameters")

### type[​](#type "Direct link to type")

The type of event to listen for.

### callback[​](#callback "Direct link to callback")

The callback to be invoked when the event occurs.

## Remarks[​](#remarks "Direct link to Remarks")

## Available event types[​](#available-event-types "Direct link to Available event types")

### `"nodechange"`[​](#nodechange "Direct link to nodechange")

This event will be emitted when a node on the page is added, removed, or updated.

The callback will receive a NodeChangeEvent with the below interface:

```
interface NodeChangeEvent {  
  nodeChanges: NodeChange[]  
}
```

There are 3 different [`NodeChange`](../NodeChange.md) types. Each of these changes has a `type` property to distinguish them:

| Change | `type` property | Description |
| --- | --- | --- |
| [`CreateChange`](../NodeChange.md#createchange) | `'CREATE'` | A node has been created in the page. If a node with nested children is being added to the page a `CreateChange` will only be made for the highest level parent that was added to the page. |
| [`DeleteChange`](../NodeChange.md#deletechange) | `'DELETE'` | A node has been removed from the page. If a node with nested children is being removed from the page a `DeleteChange` will only be made for the highest level parent that was removed from the page. |
| [`PropertyChange`](../NodeChange.md#propertychange) | `'PROPERTY_CHANGE'` | A property of a node has changed. |

[Previous

flowStartingPoints](PageNode-flowstartingpoints.md)[Next

off](PageNode-off.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [type](#type)
  - [callback](#callback)
- [Remarks](#remarks)
- [Available event types](#available-event-types)
  - [`"nodechange"`](#nodechange)
