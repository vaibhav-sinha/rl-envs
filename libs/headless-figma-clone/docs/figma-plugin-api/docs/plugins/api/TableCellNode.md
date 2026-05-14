<!-- source: https://developers.figma.com/docs/plugins/api/TableCellNode -->

- Plugins
- [Node Types](nodes.md)
- TableCellNode

On this page

Table cells are elements within a [TableNode](TableNode.md).

## Table cell properties[​](#table-cell-properties "Direct link to Table cell properties")

### type: 'TABLE\_CELL' [readonly]

The type of this node, represented by the string literal "TABLE\_CELL"

---

### text: [TextSublayerNode](TextSublayer.md#text-sublayer-node) [readonly]

Text sublayer of the TableCellNode

---

### rowIndex: number [readonly]

The row index of this cell relative to its parent table.

---

### columnIndex: number [readonly]

The column index of this cell relative to its parent table.

---

## Basic properties[​](#basic-properties "Direct link to Basic properties")

### [toString](properties/nodes-tostring.md)(): string

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](properties/nodes-tostring.md)

---

### [parent](properties/nodes-parent.md): ([BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin)) | null [readonly]

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](properties/nodes-appendchild.md).

[View more →](properties/nodes-parent.md)

---

### height: number [readonly]

The height of the node. Use a resizing method to change this value.

---

### width: number [readonly]

The width of the node. Use a resizing method to change this value.

---

## Fill-related properties[​](#fill-related-properties "Direct link to Fill-related properties")

### [fills](properties/nodes-fills.md): ReadonlyArray<[Paint](Paint.md)> | [figma.mixed](properties/figma-mixed.md)

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](../editing-properties.md).

[View more →](properties/nodes-fills.md)

---

### [fillStyleId](properties/nodes-fillstyleid.md): string | [figma.mixed](properties/figma-mixed.md)

The id of the [`PaintStyle`](PaintStyle.md) object that the [`fills`](properties/nodes-fills.md) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

[View more →](properties/nodes-fillstyleid.md)

---

### setFillStyleIdAsync(styleId: string): Promise<void>

Sets the [`PaintStyle`](PaintStyle.md) that the [`fills`](properties/nodes-fills.md) property of this node is linked to.

---

### setFillsAsync(paints: ReadonlyArray<[Paint](Paint.md)>): Promise<void>

Sets the fills of the node asynchronously. This is the only way to set pattern fills on a node, since we need to ensure that the source node of the pattern is loaded first. See [Adding Pattern Fills and Strokes](../adding-pattern-fills-and-strokes.md) for more information.

---

[Previous

StickyNode](StickyNode.md)[Next

TableNode](TableNode.md)

- [Table cell properties](#table-cell-properties)
- [Basic properties](#basic-properties)
- [Fill-related properties](#fill-related-properties)
