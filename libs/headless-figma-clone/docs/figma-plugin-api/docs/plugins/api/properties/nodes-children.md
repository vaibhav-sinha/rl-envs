<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-children -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- children

On this page

The list of children, sorted back-to-front. That is, the first child in the array is the bottommost layer on the screen, and the last child in the array is the topmost layer.

If the manifest contains `"documentAccess": "dynamic-page"`, **and** the node is a [`PageNode`](../PageNode.md), you must first call [`loadAsync`](../PageNode.md#loadasync) to access this property.

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

### [children](nodes-children.md): ReadonlyArray<[SceneNode](../nodes.md#scene-node)> [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

This array can be read like and iterated like a regular array. However, calling this property always returns a new array, and both the property and the new array are read-only.

As such, this property cannot be assigned to, and the array cannot be modified directly (it wouldn't do anything). Instead, use [`appendChild`](nodes-appendchild.md), [`insertChild`](nodes-insertchild.md) or [`remove`](nodes-remove.md).

info

If you are curious, the reason why inserting children has to be done via API calls is because our internal representation for the layer tree uses [fractional indexing](https://www.figma.com/blog/multiplayer-editing-in-figma/) and [`insertChild`](nodes-insertchild.md) performs that conversion.

[Previous

characters](TextNode-characters.md)[Next

clearExplicitVariableModeForCollection](ExplicitVariableModesMixin-clearexplicitvariablemodeforcollection.md)

- [Signature](#signature)
- [Remarks](#remarks)
