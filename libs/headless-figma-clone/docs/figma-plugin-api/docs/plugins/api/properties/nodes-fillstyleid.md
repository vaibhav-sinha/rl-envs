<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-fillstyleid -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- fillStyleId

On this page

The id of the [`PaintStyle`](../PaintStyle.md) object that the [`fills`](nodes-fills.md) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

Supported on:

- [BooleanOperationNode](../BooleanOperationNode.md)
- [ComponentNode](../ComponentNode.md)
- [ComponentSetNode](../ComponentSetNode.md)
- [EllipseNode](../EllipseNode.md)
- [FrameNode](../FrameNode.md)
- [HighlightNode](../HighlightNode.md)
- [InstanceNode](../InstanceNode.md)
- [LineNode](../LineNode.md)
- [PolygonNode](../PolygonNode.md)
- [RectangleNode](../RectangleNode.md)
- [SectionNode](../SectionNode.md)
- [ShapeWithTextNode](../ShapeWithTextNode.md)
- [SlideNode](../SlideNode.md)
- [SlotNode](../SlotNode.md)
- [StampNode](../StampNode.md)
- [StarNode](../StarNode.md)
- [StickyNode](../StickyNode.md)
- [TableCellNode](../TableCellNode.md)
- [TableNode](../TableNode.md)
- [TextNode](../TextNode.md)
- [TextPathNode](../TextPathNode.md)
- [TextSublayerNode](../TextSublayer.md)
- [VectorNode](../VectorNode.md)
- [WashiTapeNode](../WashiTapeNode.md)

## Signature[​](#signature "Direct link to Signature")

### [fillStyleId](nodes-fillstyleid.md): string | [figma.mixed](figma-mixed.md)

## Remarks[​](#remarks "Direct link to Remarks")

This property can return [`figma.mixed`](figma-mixed.md) if the node has multiple fills.properties. Text nodes can have multiple fills if some characters are colored differently than others.

[Previous

exportAsync](nodes-exportasync.md)[Next

fills](nodes-fills.md)

- [Signature](#signature)
- [Remarks](#remarks)
