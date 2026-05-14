<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-getdevresourcesasync -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- getDevResourcesAsync

On this page

Gets all of the dev resources on a node. This includes any inherited dev resources from components and component sets.

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

### getDevResourcesAsync(options?: { includeChildren: boolean }): Promise<[DevResourceWithNodeId](../DevResource.md#dev-resource-with-node-id)[]>

## Parameters[​](#parameters "Direct link to Parameters")

### options[​](#options "Direct link to options")

An optional parameter to include getting all of the dev resources on the children of the node. Defaults to false.

[Previous

findWidgetNodesByWidgetId](nodes-findwidgetnodesbywidgetid.md)[Next

getStyledTextSegments](TextNode-getstyledtextsegments.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [options](#options)
