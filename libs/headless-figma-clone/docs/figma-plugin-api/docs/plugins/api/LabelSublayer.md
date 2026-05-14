<!-- source: https://developers.figma.com/docs/plugins/api/LabelSublayer -->

- Plugins
- [Data Types](data-types.md)
- LabelSublayer

On this page

LabelSublayer (on [ConnectorNodes](ConnectorNode.md)) acts like pared-back version of a rectangle node. It is used to provide a background on text.

## Basic traits[​](#basic-traits "Direct link to Basic traits")

### [toString](properties/nodes-tostring.md)(): string

Returns a string representation of the node. For debugging purposes only, do not rely on the exact output of this string in production code.

[View more →](properties/nodes-tostring.md)

---

### [parent](properties/nodes-parent.md): ([BaseNode](nodes.md#base-node) & [ChildrenMixin](node-properties.md#children-mixin)) | null [readonly]

Returns the parent of this node, if any. This property is not meant to be directly edited. To reparent, see [`appendChild`](properties/nodes-appendchild.md).

[View more →](properties/nodes-parent.md)

---

> Tip: `parent` will always return a [ConnectorNode](ConnectorNode.md)

## Geometry-related properties[​](#geometry-related-properties "Direct link to Geometry-related properties")

### [fills](properties/nodes-fills.md): ReadonlyArray<[Paint](Paint.md)> | [figma.mixed](properties/figma-mixed.md)

The paints used to fill the area of the shape. For help on how to change this value, see [Editing Properties](../editing-properties.md).

[View more →](properties/nodes-fills.md)

---

### [fillStyleId](properties/nodes-fillstyleid.md): string | [figma.mixed](properties/figma-mixed.md)

The id of the [`PaintStyle`](PaintStyle.md) object that the [`fills`](properties/nodes-fills.md) property of this node is linked to.

If the manifest contains`"documentAccess": "dynamic-page"`, this property is read-only. Use `setFillStyleIdAsync` to update the style.

[View more →](properties/nodes-fillstyleid.md)

---

### [cornerRadius](properties/nodes-cornerradius.md): number | [figma.mixed](properties/figma-mixed.md)

The number of pixels to round the corners of the object by.

[View more →](properties/nodes-cornerradius.md)

---

### topLeftRadius: number

---

### topRightRadius: number

---

### bottomLeftRadius: number

---

### bottomRightRadius: number

---

You can set individual corner radius of each of the four corners of a rectangle node or frame-like node. Similar to `cornerRadius`, these value must be non-negative and can be fractional. If an edge length is less than twice the corner radius, the corner radius for each vertex of the edge will be clamped to half the edge length.

Setting `cornerRadius` sets the property for all four corners. Setting these corners to different values makes `cornerRadius` return `mixed`.

[Previous

InstanceSwapPreferredValue](InstanceSwapPreferredValue.md)[Next

LayoutGrid](LayoutGrid.md)

- [Basic traits](#basic-traits)
- [Geometry-related properties](#geometry-related-properties)
