<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-appendchild -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- appendChild

On this page

Adds a new child to the end of the [`children`](nodes-children.md) array. That is, visually on top of all other children.

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

### [appendChild](nodes-appendchild.md)(child: [SceneNode](../nodes.md#scene-node)): void

## Remarks[​](#remarks "Direct link to Remarks")

Reparenting nodes is subject to many restrictions. For example, some nodes cannot be moved, others would break the document if moved. Below are possible exceptions that can be thrown if the operation is invalid.

If this is called on an auto-layout frame, calling this function can cause this layer to be resized and children to be moved.

## Possible error cases[​](#possible-error-cases "Direct link to Possible error cases")

`Cannot move node. Node is the scene root, which cannot be reparented`

`Cannot move node. Doing so would create a parenting cycle`

`Cannot move node. The root node cannot have children of type other than PAGE`

`Cannot move node. Nodes other than the root node cannot have children of type PAGE`

`Cannot move node. New parent is of a type that cannot have children`

`Cannot move node. New parent is a internal, readonly-only node`

`Cannot move node. Node is an internal, readonly-only node`

`Cannot move node. New parent is an instance or is inside of an instance`

`Cannot move node. Node is inside of an instance`

`Cannot move node. Reparenting would create a component cycle`

`Cannot move node. Reparenting would create a component inside a component`

`Cannot move node. Reparenting would create a component set cycle`

`Cannot move node. A COMPONENT_SET node cannot have children of type other than COMPONENT`

`Cannot move node. PageDivider cannot have children`

`Cannot move node. Node is not allowed SLOT node`

[Previous

addDevResourceAsync](nodes-adddevresourceasync.md)[Next

appendChildAt](nodes-appendchildat.md)

- [Signature](#signature)
- [Remarks](#remarks)
- [Possible error cases](#possible-error-cases)
