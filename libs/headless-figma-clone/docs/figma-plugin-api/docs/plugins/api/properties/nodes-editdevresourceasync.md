<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-editdevresourceasync -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- editDevResourceAsync

On this page

Edits a dev resource on a node. This will fail if the node does not have a dev resource with the same url.

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

### editDevResourceAsync(currentUrl: string, newValue: { name: string; url: string }): Promise<void>

## Parameters[​](#parameters "Direct link to Parameters")

### currentUrl[​](#currenturl "Direct link to currentUrl")

The current url of the dev resource.

### newValue[​](#newvalue "Direct link to newValue")

The new name and/or url of the dev resource.

[Previous

documentationLinks](nodes-documentationlinks.md)[Next

exportAsync](nodes-exportasync.md)

- [Signature](#signature)
- [Parameters](#parameters)
  - [currentUrl](#currenturl)
  - [newValue](#newvalue)
