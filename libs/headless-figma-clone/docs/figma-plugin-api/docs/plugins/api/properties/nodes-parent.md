<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-parent -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- parent

On this page

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](nodes-appendchild.md).

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [CodeBlockNode](../CodeBlockNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [ConnectorNode](../ConnectorNode.md)
- [DocumentNode](../DocumentNode.md)
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
- [PageNode](../PageNode.md)
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

### [parent](nodes-parent.md): ([BaseNode](../nodes.md#base-node) & [ChildrenMixin](../node-properties.md#children-mixin)) | null [readonly]

## Remarks[​](#remarks "Direct link to Remarks")

The root node (i.e. `figma.root`) doesn't have a parent.

Components accessed via [`instance.getMainComponentAsync()`](../InstanceNode.md#getmaincomponentasync) or [`instance.mainComponent`](../InstanceNode.md#maincomponent) do not always have a parent. They could be remote components or soft-deleted components.

[Previous

overflowDirection](nodes-overflowdirection.md)[Next

primaryAxisAlignItems](nodes-primaryaxisalignitems.md)

- [Signature](#signature)
- [Remarks](#remarks)
