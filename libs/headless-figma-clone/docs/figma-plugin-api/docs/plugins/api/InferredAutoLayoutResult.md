<!-- source: https://developers.figma.com/docs/plugins/api/InferredAutoLayoutResult -->

- Plugins
- [Data Types](data-types.md)
- InferredAutoLayoutResult

### [layoutMode](properties/nodes-layoutmode.md): 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'

Determines whether this layer uses auto-layout to position its children. Defaults to "NONE".

[View more →](properties/nodes-layoutmode.md)

---

### paddingLeft: number

Applicable only on auto-layout frames. Determines the left padding between the border of the frame and its children.

---

### paddingRight: number

Applicable only on auto-layout frames. Determines the right padding between the border of the frame and its children.

---

### paddingTop: number

Applicable only on auto-layout frames. Determines the top padding between the border of the frame and its children.

---

### paddingBottom: number

Applicable only on auto-layout frames. Determines the bottom padding between the border of the frame and its children.

---

### horizontalPadding: number

**DEPRECATED:** Use `paddingLeft` and `paddingRight` instead.

---

### verticalPadding: number

**DEPRECATED:** Use `paddingTop` and `paddingBottom` instead.

---

### [primaryAxisSizingMode](properties/nodes-primaryaxissizingmode.md): 'FIXED' | 'AUTO'

Applicable only on auto-layout frames. Determines whether the primary axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](properties/nodes-primaryaxissizingmode.md)

---

### [counterAxisSizingMode](properties/nodes-counteraxissizingmode.md): 'FIXED' | 'AUTO'

Applicable only on auto-layout frames. Determines whether the counter axis has a fixed length (determined by the user) or an automatic length (determined by the layout engine).

[View more →](properties/nodes-counteraxissizingmode.md)

---

### [strokesIncludedInLayout](properties/nodes-strokesincludedinlayout.md): boolean

Applicable only on auto-layout frames. Determines whether strokes are included in [layout calculations](https://help.figma.com/hc/en-us/articles/31289464393751-Use-the-horizontal-and-vertical-flows-in-auto-layout#01JT9NA4HVT02ZPE7BA86SFCD6). When true, auto-layout frames behave like css `box-sizing: border-box`.

[View more →](properties/nodes-strokesincludedinlayout.md)

---

### [layoutWrap](properties/nodes-layoutwrap.md): 'NO\_WRAP' | 'WRAP'

Determines whether this layer should use wrapping auto-layout. Defaults to `"NO_WRAP"`.

[View more →](properties/nodes-layoutwrap.md)

---

### [primaryAxisAlignItems](properties/nodes-primaryaxisalignitems.md): 'MIN' | 'MAX' | 'CENTER' | 'SPACE\_BETWEEN'

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the primary axis direction.

[View more →](properties/nodes-primaryaxisalignitems.md)

---

### [counterAxisAlignItems](properties/nodes-counteraxisalignitems.md): 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines how the auto-layout frame’s children should be aligned in the counter axis direction.

[View more →](properties/nodes-counteraxisalignitems.md)

---

### [counterAxisAlignContent](properties/nodes-counteraxisaligncontent.md): 'AUTO' | 'SPACE\_BETWEEN'

Applicable only on auto-layout frames with [`layoutWrap`](properties/nodes-layoutwrap.md) set to `"WRAP"`. Determines how the wrapped tracks are spaced out inside of the auto-layout frame.

[View more →](properties/nodes-counteraxisaligncontent.md)

---

### [itemSpacing](properties/nodes-itemspacing.md): number

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines distance between children of the frame.

[View more →](properties/nodes-itemspacing.md)

---

### [counterAxisSpacing](properties/nodes-counteraxisspacing.md): number | null

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames with [`layoutWrap`](properties/nodes-layoutwrap.md) set to `"WRAP"`. Determines the distance between wrapped tracks. The value must be positive.

[View more →](properties/nodes-counteraxisspacing.md)

---

### [itemReverseZIndex](properties/nodes-itemreversezindex.md): boolean

Applicable only on "HORIZONTAL" or "VERTICAL" auto-layout frames. Determines the [canvas stacking order](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties#Canvas_stacking_order) of layers in this frame. When true, the first layer will be draw on top.

[View more →](properties/nodes-itemreversezindex.md)

---

### [layoutAlign](properties/nodes-layoutalign.md): 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT'

Applicable only on direct children of auto-layout frames. Determines if the layer should stretch along the parent’s counter axis. Defaults to `“INHERIT”`.

[View more →](properties/nodes-layoutalign.md)

---

### [layoutGrow](properties/nodes-layoutgrow.md): number

This property is applicable only for direct children of auto-layout frames. Determines whether a layer should stretch along the parent’s primary axis. 0 corresponds to a fixed size and 1 corresponds to stretch.

[View more →](properties/nodes-layoutgrow.md)

---

### [layoutPositioning](properties/nodes-layoutpositioning.md): 'AUTO' | 'ABSOLUTE'

This property is applicable only for direct children of auto-layout frames. Determines whether a layer's size and position should be dermined by auto-layout settings or manually adjustable.

[View more →](properties/nodes-layoutpositioning.md)

---

[Previous

Image](Image.md)[Next

InheritedStyleField](InheritedStyleField.md)
