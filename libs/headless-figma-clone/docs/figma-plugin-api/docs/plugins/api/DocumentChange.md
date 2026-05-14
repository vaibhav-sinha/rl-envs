<!-- source: https://developers.figma.com/docs/plugins/api/DocumentChange -->

- Plugins
- [Data Types](data-types.md)
- DocumentChange

On this page

Figma has 6 types of document changes that we currently notify on.

```
type DocumentChange =  
  | CreateChange  
  | DeleteChange  
  | PropertyChange  
  | StyleCreateChange  
  | StyleDeleteChange  
  | StylePropertyChange
```

## DocumentChange (common properties)[​](#documentchange-common-properties "Direct link to DocumentChange (common properties)")

### id: string

The id of the node / style that is subject to the document change. The same that is on `node.id` or `style.id`

---

### origin: 'LOCAL' | 'REMOTE'

Where the change originates from. If the change is 'LOCAL' it is from the user running the plugin and if it is 'REMOTE' it is from a different user in the file.

---

## CreateChange[​](#createchange "Direct link to CreateChange")

Emitted when a node has been created in the document. If a node with nested children is being added to the document a `CreateChange` will only be made for the highest level parent that was added to the document.

### type: 'CREATE'

The string literal "CREATE" representing the type of document change this is. Always check the type before reading other properties.

---

### node: [SceneNode](nodes.md#scene-node) | [RemovedNode](RemovedNode.md)

The node that changed in the document. If the node has been removed since the event happened this will be a [`RemovedNode`](RemovedNode.md)

---

## DeleteChange[​](#deletechange "Direct link to DeleteChange")

Emitted when a node has been removed from the document. If a node with nested children is being removed from the document a `DeleteChange` will only be made for the highest level parent that was removed from the document.

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

## StyleCreateChange[​](#stylecreatechange "Direct link to StyleCreateChange")

Emitted when a style has been added to the document.

### type: 'STYLE\_CREATE'

The string literal "STYLE\_CREATE" representing the type of document change this is. Always check the type before reading other properties.

---

### style: [BaseStyle](BaseStyle.md) | null

The style that has been updated in the document. This is null for StyleDeleteChange.

---

## StyleDeleteChange[​](#styledeletechange "Direct link to StyleDeleteChange")

Emitted when a style has been removed from the document.

### type: 'STYLE\_DELETE'

The string literal "STYLE\_DELETE" representing the type of document change this is. Always check the type before reading other properties. In this case, the returned style is null.

---

### style: [BaseStyle](BaseStyle.md) | null

The style that has been updated in the document. This is null for StyleDeleteChange.

---

## StylePropertyChange[​](#stylepropertychange "Direct link to StylePropertyChange")

Emitted when a style has had a property changed.

### type: 'STYLE\_PROPERTY\_CHANGE'

The string literal "STYLE\_PROPERTY\_CHANGE" representing the type of document change this is. Always check the type before reading other properties.

---

### properties: [StyleChangeProperty](StyleChangeProperty.md)[]

Array of properties that have been changed on the node.

---

### style: [BaseStyle](BaseStyle.md) | null

The style that has been updated in the document. This is null for StyleDeleteChange.

---

[Previous

DevStatus](DevStatus.md)[Next

DocumentChangeEvent](DocumentChangeEvent.md)

- [DocumentChange (common properties)](#documentchange-common-properties)
- [CreateChange](#createchange)
- [DeleteChange](#deletechange)
- [PropertyChange](#propertychange)
- [StyleCreateChange](#stylecreatechange)
- [StyleDeleteChange](#styledeletechange)
- [StylePropertyChange](#stylepropertychange)
