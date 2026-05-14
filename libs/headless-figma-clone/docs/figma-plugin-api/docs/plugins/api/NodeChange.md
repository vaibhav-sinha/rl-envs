<!-- source: https://developers.figma.com/docs/plugins/api/NodeChange -->

- Plugins
- [Data Types](data-types.md)
- NodeChange

On this page

Figma has three types of page node changes that we currently notify on.

```
type NodeChange =  
  | CreateChange  
  | DeleteChange  
  | PropertyChange
```

## NodeChange (common properties)[​](#nodechange-common-properties "Direct link to NodeChange (common properties)")

### node: [SceneNode](nodes.md#scene-node) | [RemovedNode](RemovedNode.md)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](RemovedNode.md)

---

## CreateChange[​](#createchange "Direct link to CreateChange")

Emitted when a node has been created in the page. If a node with nested children is being added to the page a `CreateChange` will only be made for the highest level parent that was added to the page.

### type: 'CREATE'

The string literal "CREATE" representing the type of document change this is. Always check the type before reading other properties.

---

### node: [SceneNode](nodes.md#scene-node) | [RemovedNode](RemovedNode.md)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](RemovedNode.md)

---

## DeleteChange[​](#deletechange "Direct link to DeleteChange")

Emitted when a node has been removed from the page. If a node with nested children is being removed from the page a `DeleteChange` will only be made for the highest level parent that was removed from the page.

### type: 'DELETE'

The string literal "DELETE" representing the type of document change this is. Always check the type before reading other properties.

---

### node: [SceneNode](nodes.md#scene-node) | [RemovedNode](RemovedNode.md)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](RemovedNode.md)

---

## PropertyChange[​](#propertychange "Direct link to PropertyChange")

Emitted when a property of a node has changed.

### type: 'PROPERTY\_CHANGE'

The string literal "PROPERTY\_CHANGE" representing the type of document change this is. Always check the type before reading other properties.

---

### properties: [NodeChangeProperty](NodeChangeProperty.md)[]

Array of properties that have been changed on the node.

---

### node: [SceneNode](nodes.md#scene-node) | [RemovedNode](RemovedNode.md)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](RemovedNode.md)

---

[Previous

MediaData](MediaData.md)[Next

NodeChangeEvent](NodeChangeEvent.md)

- [NodeChange (common properties)](#nodechange-common-properties)
- [CreateChange](#createchange)
- [DeleteChange](#deletechange)
- [PropertyChange](#propertychange)
