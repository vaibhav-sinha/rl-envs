<!-- source: https://developers.figma.com/docs/plugins/api/properties/nodes-fills -->

- Plugins
- [Shared Node Properties](../node-properties.md)
- fills

On this page

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](../../editing-properties.md).

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

### [fills](nodes-fills.md): ReadonlyArray<[Paint](../Paint.md)> | [figma.mixed](figma-mixed.md)

## Remarks[​](#remarks "Direct link to Remarks")

This property can return [`figma.mixed`](figma-mixed.md) if the node has multiple sets of fills. Text nodes can have multiple sets of fills if some characters are colored differently than others.

Use [`solidPaint`](figma-util-solidpaint.md) to create solid paint fills with CSS color strings.

Page nodes have a [`backgrounds`](../PageNode.md#backgrounds) property instead of a `fills` property.

In order to set pattern fills, you must use the [`setFillsAsync`](../node-properties.md#setfillsasync) method to ensure that the source node of the pattern is loaded first.

[Previous

fillStyleId](nodes-fillstyleid.md)[Next

findAll](nodes-findall.md)

- [Signature](#signature)
- [Remarks](#remarks)
