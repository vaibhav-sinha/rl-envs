<!-- source: https://developers.figma.com/docs/plugins/api/properties/figma-transformgroup -->

- Plugins
- [Global Objects](../global-objects.md)
- [figma](../figma.md)
- transformGroup

On this page

Creates a new [`TransformGroupNode`](../TransformGroupNode.md) containing all the nodes in `nodes`, applying the transformations specified in `modifiers` to each child node.

## Signature[​](#signature "Direct link to Signature")

### transformGroup(nodes: ReadonlyArray<[SceneNode](../nodes.md#scene-node)>, parent: [BaseNode](../nodes.md#base-node) & [ChildrenMixin](../node-properties.md#children-mixin), index: number, modifiers: [TransformModifier](../TransformModifier.md)[]): [TransformGroupNode](../TransformGroupNode.md)

## Parameters[​](#parameters "Direct link to Parameters")

### nodes[​](#nodes "Direct link to nodes")

The list of nodes in the new group. This list must be non-empty as Figma does not support empty groups. This list cannot include any node that cannot be reparented, such as children of instances.

### parent[​](#parent "Direct link to parent")

The node under which the new group will be created. This is similar to `parent.appendChild(group)`, but must be specified at the time that the group is created rather than later.

### index[​](#index "Direct link to index")

An index argument that specifies where inside `parent` the new group will be created.

### modifiers[​](#modifiers "Direct link to modifiers")

The list of transform modifiers to apply to each corresponding node in `nodes`.

[Previous

group](figma-group.md)[Next

flatten](figma-flatten.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [nodes](#nodes)
  - [parent](#parent)
  - [index](#index)
  - [modifiers](#modifiers)
