<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-stucknodes -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- stuckNodes

On this page

An array of nodes that are "stuck" to this node. In FigJam, stamps, highlights, and some widgets can "stick"
to other nodes if they are dragged on top of another node.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [EllipseNode](../EllipseNode.md)
- [EmbedNode](../EmbedNode.md)
- [FrameNode](../FrameNode.md)
- [GroupNode](../GroupNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [InteractiveSlideElementNode](../InteractiveSlideElementNode.md)
- [LineNode](../LineNode.md)
- [LinkUnfurlNode](../LinkUnfurlNode.md)
- [MediaNode](../MediaNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SliceNode](../SliceNode.md)
- [SlideGridNode](../SlideGridNode.md)
- [SlideNode](../SlideNode.md)
- [SlideRowNode](../SlideRowNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [StickyNode](../StickyNode.md)
- [TableNode](../TableNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TransformGroupNode](../TransformGroupNode.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)
- [WidgetNode](../WidgetNode.md)

## Signature[​](#signature "Direct link to Signature")

### [stuckNodes](nodes-stucknodes.md): [SceneNode](../nodes.md#scene-node)[] [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

This property is only available in FigJam.

In FigJam a stickable host that means that stickables, like `'STAMP'` nodes, are allowed to attach themselves to the node. If the stickable host moves all nodes that are in `stuckNodes` move along with it.

[Previous

strokesIncludedInLayout](nodes-strokesincludedinlayout.md)[Next

stuckTo](nodes-stuckto.md)

- [Signature](#signature)
- [Remarks](#remarks)
